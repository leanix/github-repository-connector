/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');
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
		metadata: { connectorLoggingUrl, runId }
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

	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, `Fetching repository's visibility related data`);
	const repoVisibilityOutput = [];
	const repoVisibilities = ['private', 'public', 'internal'];
	for (let visibilityType of repoVisibilities) {
		repoVisibilityOutput.push(
			context.df.callActivity('GetReposVisibilityData', {
				orgName,
				visibilityType,
				ghToken
			})
		);
	}
	try {
		const repoVisibilityPartialResults = yield context.df.Task.all(repoVisibilityOutput);
		var repoIdsVisibilityMap = {};
		for (let visibilityResult of repoVisibilityPartialResults) {
			repoIdsVisibilityMap = { ...repoIdsVisibilityMap, ...visibilityResult };
		}
	} catch (e) {
		context.log(e);
		yield logger.logError(context, e.message);
		repoIdsVisibilityMap = {};
	}
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Successfully fetched repo visibility related data');
	yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Starting to generate final LDIF and save into storage');
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Progress: 90%, Successfully requested the data from GitHub'
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

function* fetchReposDataConcurrently(context, repositoriesIds) {
	const {
		secretsConfiguration: { ghToken },
		connectorLoggingUrl,
		runId
	} = context.bindingData.input;

	const scannerCapacity = 100;
	const allReposSetOfCapacity = [];
	for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
		allReposSetOfCapacity.push(repositoriesIds.slice(i, i + scannerCapacity));
	}

	const completePartialResults = [];
	const workers = 4;
	const workingGroups = [];
	for (let i = 0, j = allReposSetOfCapacity.length; i < j; i += workers) {
		workingGroups.push(allReposSetOfCapacity.slice(i, i + workers));
	}

	for (const workingGroup of workingGroups) {
		const output = [];
		for (const workingGroupElement of workingGroup) {
			output.push(context.df.callActivity('GetSubReposData', { repoIds: workingGroupElement, ghToken, connectorLoggingUrl, runId }));
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
		runId
	} = context.bindingData.input;

	try {
		yield logger.logInfoFromOrchestrator(context, context.df.isReplaying, 'Fetching organisation teams related data');
		const teamResultsWithInitialRepos = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken,
			orgRepositoriesIds: repositoriesIds,
			metadata: { connectorLoggingUrl, runId }
		});

		const finalTeamsResult = [];
		if (teamResultsWithInitialRepos && teamResultsWithInitialRepos.length) {
			const output = [];
			for (const team of teamResultsWithInitialRepos) {
				if (team.hasMoreReposInitialSet) {
					output.push(
						context.df.callActivity('GetOrgTeamReposData', {
							orgName,
							ghToken,
							orgRepositoriesIds: repositoriesIds,
							team,
							metadata: { connectorLoggingUrl, runId }
						})
					);
				} else {
					finalTeamsResult.push(team);
				}
			}
			const teamWithAllRepos = yield context.df.Task.all(output);
			finalTeamsResult.push(...teamWithAllRepos);
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

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl } = context.bindingData.input;
	const logger = getLoggerInstanceFromContext(context);
	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	try {
		yield context.df.callActivity('TestConnector', context.bindingData.input);
		const logDataMetricsInfo = yield* processForLdif(context, logger);
		yield context.df.callActivity('UpdateProgressToIHub', {
			progressCallbackUrl,
			status: iHubStatus.IN_PROGRESS,
			message: `Progress 100%. Total repositories fetched: ${logDataMetricsInfo.totalRepositories}, Total teams fetched: ${logDataMetricsInfo.totalTeams}`
		});
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, { progressCallbackUrl, status: iHubStatus.FINISHED });
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
