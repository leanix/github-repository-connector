/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');
const { DateTime } = require('luxon');
const Util = require("../Lib/helper");

function* processForLdif(context, logger) {
	const {
		connectorConfiguration: { orgName, repoNamesExcludeList, flags },
		secretsConfiguration: { ghToken },
		ldifResultUrl,
		progressCallbackUrl,
		bindingKey,
		connectorLoggingUrl,
		runId
	} = context.bindingData.input;

	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Fetching ids of all the repos present in the org.');

	const repoNamesExcludeListChecked = repoNamesExcludeList ? repoNamesExcludeList : [];
	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', {
		orgName,
		repoNamesExcludeListChecked,
		ghToken,
		metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
	});

	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Successfully fetched ids of all repos present in the org');
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Fetching complete repo information from collected repo ids.');

	const partialResults = yield* fetchReposDataConcurrently(context, repositoriesIds);

	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Progress 20%'
	});

	yield logger.logInfoFromOrchestrator(
		context,
		context.df.isReplaying,
		'Successfully fetched complete repo information from collected repo ids.'
	);

	const teamResults = yield* fetchTeams(context, logger, repositoriesIds);
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Progress 40%'
	});
	const repoIdsVisibilityMap = yield* fetchRepoVisibility(context, logger);
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Starting to generate final LDIF and save into storage');
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Progress: 90%: Successfully requested the data from GitHub'
	});

	yield context.df.callActivity('SaveLdifToStorage', {
		partialResults,
		teamResults,
		repoIdsVisibilityMap,
		blobStorageSasUrl: ldifResultUrl,
		metadata: {
			bindingKey,
			orgName,
			flags
		}
	});
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Successfully generated LDIF and saved into storage');
	return {
		totalRepositories: repositoriesIds.length,
		totalTeams: teamResults.length
	};
}

function* fetchReposDataConcurrently(context, repositoriesIds, maxConcurrentWorkers = 4) {
	const {
		secretsConfiguration: { ghToken },
		connectorLoggingUrl,
		runId,
		progressCallbackUrl
	} = context.bindingData.input;

	const scannerCapacity = 100;
	const allReposSetOfCapacity = [];
	for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
		allReposSetOfCapacity.push(repositoriesIds.slice(i, i + scannerCapacity));
	}

	const completePartialResults = [];
	const workingGroups = [];
	for (let i = 0, j = allReposSetOfCapacity.length; i < j; i += maxConcurrentWorkers) {
		workingGroups.push(allReposSetOfCapacity.slice(i, i + maxConcurrentWorkers));
	}

	for (const workingGroup of workingGroups) {
		const output = [];
		for (const workingGroupElement of workingGroup) {
			output.push(
				context.df.callActivity('GetSubReposData', {
					repoIds: workingGroupElement,
					ghToken,
					metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
				})
			);
		}
		const partialResults = yield context.df.Task.all(output);
		completePartialResults.push(...partialResults);
	}

	return completePartialResults;
}

function* fetchTeams(context, logger, repositoriesIds) {
	const {
		connectorConfiguration: { orgName, flags },
		secretsConfiguration: { ghToken },
		connectorLoggingUrl,
		runId,
		progressCallbackUrl
	} = context.bindingData.input;

	try {
		yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Fetching organisation teams related data');
		const teamResultsWithInitialRepos = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken,
			orgRepositoriesIds: repositoriesIds,
			metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
		});

		Util.verifyTeamReposDataLimit(teamResultsWithInitialRepos);

		const finalTeamsResult = teamResultsWithInitialRepos.filter((team) => !team.hasMoreReposInitialSet);
		if (finalTeamsResult.length !== teamResultsWithInitialRepos.length) {
			// If there are teams which have more than initially fetched repositories set
			const teamsWithMoreRepos = teamResultsWithInitialRepos.filter((team) => team.hasMoreReposInitialSet);
			const data = yield* fetchTeamReposConcurrently(context, logger, repositoriesIds, teamsWithMoreRepos);
			finalTeamsResult.push(...data);
		}

		yield logger.logInfoFromOrchestrator(
			context,
			context.df.isReplaying,
			`Successfully fetched organisation teams data. Result: ${finalTeamsResult.length}`
		);

		// Default case is true. so, explicitly check for false(boolean)
		if (flags && flags.importTeams === false) {
			yield logger.logInfoFromOrchestrator(
				context,
				context.df.isReplaying,
				`Team data will not be processed (default). reason: 'importTeams' flag is false`
			);
		}
		return finalTeamsResult;
	} catch (e) {
		yield logger.logError(context, e.message);
		return [];
	}
}

function isRateLimitExceededError(e) {
	if (!e) {
		return [false];
	}
	if (!e.headers) {
		return [false];
	}
	const isExceeded =
		e.name === 'GraphqlError' && (parseInt(e.headers['x-ratelimit-remaining']) === 0 || e.message.includes('API rate limit'));
	return [isExceeded, e.headers['x-ratelimit-reset']];
}

function* fetchTeamReposConcurrently(context, logger, repositoriesIds, teams, maxConcurrentWorkers = 4) {
	if (!teams || !teams.length) {
		return [];
	}

	const {
		connectorConfiguration: { orgName },
		secretsConfiguration: { ghToken },
		connectorLoggingUrl,
		progressCallbackUrl,
		runId
	} = context.bindingData.input;

	const result = [];
	const workingGroups = [];
	for (let i = 0, j = teams.length; i < j; i += maxConcurrentWorkers) {
		workingGroups.push(teams.slice(i, i + maxConcurrentWorkers));
	}

	for (const workingGroup of workingGroups) {
		const output = [];
		try {
			for (const workingGroupTeam of workingGroup) {
				output.push(
					context.df.callActivity('GetOrgTeamReposData', {
						orgName,
						ghToken,
						orgRepositoriesIds: repositoriesIds,
						team: workingGroupTeam,
						metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
					})
				);
			}
			yield context.df.callActivity('UpdateProgressToIHub', {
				progressCallbackUrl,
				status: iHubStatus.IN_PROGRESS,
				message: 'Progress 25%'
			});
			const partialResults = yield context.df.Task.all(output);
			result.push(...partialResults);
		} catch (e) {
			let [limitExceeded, reset] = isRateLimitExceededError(e);
			if (limitExceeded) {
				yield logger.logInfoFromOrchestrator(
					context,
					context.df.isReplaying,
					`GitHub GraphQL API rate limit exceeded. Attempting to automatically recover. Reset after: ${reset}`
				);
				yield* sleepWithTimelyIHubUpdate(context, logger, `Progress 25%`);
				workingGroups.push(workingGroup);
			} else {
				throw e;
			}
		}
	}
	return result;
}

function* fetchRepoVisibility(context, logger) {
	const {
		connectorConfiguration: { orgName },
		secretsConfiguration: { ghToken },
		connectorLoggingUrl,
		runId,
		progressCallbackUrl
	} = context.bindingData.input;

	let repoIdsVisibilityMap = {};
	const repoVisibilities = ['private', 'public', 'internal'];
	try {
		for (let visibilityType of repoVisibilities) {
			const visibilityRepoMap = yield context.df.callActivity('GetReposVisibilityData', {
				orgName,
				visibilityType,
				ghToken,
				metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
			});
			repoIdsVisibilityMap = { ...repoIdsVisibilityMap, ...visibilityRepoMap };
		}
	} catch (e) {
		yield logger.logError(context, e.message);
		repoIdsVisibilityMap = {};
	}
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Successfully fetched repo visibility related data');
	return repoIdsVisibilityMap;
}

function* sleepWithTimelyIHubUpdate(context, logger, message, updateEveryMinutes = 10, waitForMinutes = 60) {
	const { progressCallbackUrl } = context.bindingData.input;

	for (let i = 0; i < Math.ceil(waitForMinutes / updateEveryMinutes); i++) {
		const elapse = (i + 1) * updateEveryMinutes;
		const deadline = DateTime.fromJSDate(context.df.currentUtcDateTime, { zone: 'utc' }).plus({ minutes: elapse });
		yield context.df.createTimer(deadline.toJSDate());
		const msg = `Connector sleeping: ${message}`;
		yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, msg);
		yield context.df.callActivity('UpdateProgressToIHub', {
			progressCallbackUrl,
			status: iHubStatus.IN_PROGRESS,
			msg
		});
	}
}

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl } = context.bindingData.input;
	const logger = getLoggerInstanceFromContext(context);
	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	try {
		const { connectorConfiguration, secretsConfiguration, connectorLoggingUrl, runId } = context.bindingData.input;
		yield context.df.callActivity('TestConnector', { connectorConfiguration, secretsConfiguration, connectorLoggingUrl, runId });
		const logDataMetricsInfo = yield* processForLdif(context, logger);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FINISHED,
			message: `Progress 100%. Total repositories fetched: ${logDataMetricsInfo.totalRepositories}, Total teams fetched: ${logDataMetricsInfo.totalTeams}`
		});
	} catch (e) {
		context.log(e);
		yield logger.logError(context, e.message);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FAILED,
			message: e.message
		});
		throw e;
	}
});
