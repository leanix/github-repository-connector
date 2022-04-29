/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');
const { DateTime } = require('luxon');
const Util = require('../Lib/helper');

const MAX_CAPACITY = 100;
const MAX_EVENT_REGISTER_CAPACITY = 20;
class LdifProcessor {
	constructor(context, logger) {
		this.context = context;
		this.logger = logger;
	}

	*processForLdif() {
		const {
			connectorConfiguration: { orgName, repoNamesExcludeList, repoNamesIncludeList, flags, repoNamesFilterStrategy },
			secretsConfiguration: { ghToken },
			ldifResultUrl,
			progressCallbackUrl,
			bindingKey,
			connectorLoggingUrl,
			runId
		} = this.context.bindingData.input;

		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Fetching ids of all the repos present in the org.'
		);

		const repoNamesFilterList = repoNamesFilterStrategy === 'Exclude' ? repoNamesExcludeList : repoNamesIncludeList;

		const repoNamesFilterListChecked = repoNamesFilterList ? repoNamesFilterList : [];
		const repositoriesIds = yield this.context.df.callActivity('GetAllRepositoriesForOrg', {
			orgName,
			repoNamesFilterListChecked,
			repoNamesFilterStrategy,
			ghToken,
			metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
		});

		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Successfully fetched ids of all repos present in the org'
		);
		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Fetching complete repo information from collected repo ids.'
		);

		const partialResults = yield* this.fetchReposDataConcurrently(repositoriesIds);
		const monoReposWithSubRepos = Util.getAllMonoReposWithSubRepos(partialResults);

		yield this.context.df.callActivity('UpdateProgressToIHub', {
			progressCallbackUrl,
			status: iHubStatus.IN_PROGRESS,
			message: 'Progress 20%'
		});

		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Successfully fetched complete repo information from collected repo ids.'
		);

		// Default case is true. so, explicitly check for false(boolean)
		let teamResults = [];
		if (flags && flags.importTeams === false) {
			yield this.logger.logInfoFromOrchestrator(
				this.context,
				this.context.df.isReplaying,
				`Team data will not be processed. reason: 'importTeams' flag is false`
			);
		} else {
			teamResults = yield* this.fetchTeams(repositoriesIds);
		}

		yield this.context.df.callActivity('UpdateProgressToIHub', {
			progressCallbackUrl,
			status: iHubStatus.IN_PROGRESS,
			message: 'Progress 40%'
		});
		const repoIdsVisibilityMap = yield* this.fetchRepoVisibility();

		if (flags && flags.sendEventsForDORA === false) {
			yield this.logger.logInfoFromOrchestrator(
				this.context,
				this.context.df.isReplaying,
				`Events will not be processed. reason: 'sendEventsForDORA' flag is false`
			);
		} else {
			yield this.logger.logInfoFromOrchestrator(
				this.context,
				this.context.df.isReplaying,
				`Starting events processing to send required data for DORA metrics calculation. reason: 'sendEventsForDORA' flag is true`
			);
			const repositoriesIdsWithoutMonoRepos = repositoriesIds.filter((repoId) =>
				monoReposWithSubRepos.some((monoRepo) => monoRepo.id !== repoId)
			);

			yield* this.sendEventsForDORA(repositoriesIdsWithoutMonoRepos);
			yield* this.sendMonoRepoEventsForDORA(monoReposWithSubRepos);
			yield this.logger.logInfoFromOrchestrator(
				this.context,
				this.context.df.isReplaying,
				'Successfully processed and sent events data required for DORA metrics calculation.'
			);
		}

		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Starting to generate final LDIF and save into storage'
		);
		yield this.context.df.callActivity('UpdateProgressToIHub', {
			progressCallbackUrl,
			status: iHubStatus.IN_PROGRESS,
			message: 'Progress: 90%: Successfully requested the data from GitHub'
		});

		yield this.context.df.callActivity('SaveLdifToStorage', {
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

		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Successfully generated LDIF and saved into storage'
		);

		return {
			totalRepositories: repositoriesIds.length,
			totalTeams: teamResults.length
		};
	}

	*sendEventsForDORA(repositoriesIds, maxConcurrentWorkers = 3) {
		const {
			secretsConfiguration: { ghToken, lxToken },
			connectorConfiguration: { host, orgName },
			connectorLoggingUrl,
			runId,
			progressCallbackUrl
		} = this.context.bindingData.input;

		const scannerCapacity = MAX_EVENT_REGISTER_CAPACITY;
		const allRepoIdsSetToRegisterEvents = [];
		for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
			allRepoIdsSetToRegisterEvents.push(repositoriesIds.slice(i, i + scannerCapacity));
		}

		const completePartialResults = [];
		const workingGroups = [];
		for (let i = 0, j = allRepoIdsSetToRegisterEvents.length; i < j; i += maxConcurrentWorkers) {
			workingGroups.push(allRepoIdsSetToRegisterEvents.slice(i, i + maxConcurrentWorkers));
		}

		for (const workingGroup of workingGroups) {
			const output = [];
			try {
				for (const workingGroupElement of workingGroup) {
					output.push(
						this.context.df.callActivity('SendEventsForDORA', {
							repositoriesIds: workingGroupElement,
							host,
							ghToken,
							lxToken,
							orgName,
							metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
						})
					);
				}
				const partialResults = yield this.context.df.Task.all(output);
				completePartialResults.push(...partialResults);
			} catch (e) {
				let [limitExceeded, reset] = Util.isRateLimitExceededError(e);
				if (limitExceeded) {
					yield this.logger.logInfoFromOrchestrator(
						this.context,
						this.context.df.isReplaying,
						`GitHub GraphQL API rate limit exceeded while registering events to DORA. Attempting to automatically recover. Reset after: ${reset}`
					);
					yield* this.sleepWithTimelyIHubUpdate(`Progress 50%`);
					workingGroups.push(workingGroup);
				} else {
					throw e;
				}
			}
		}

		return completePartialResults;
	}

	*sendMonoRepoEventsForDORA(monoReposWithSubRepos, maxConcurrentWorkers = 3) {
		const {
			secretsConfiguration: { ghToken, lxToken },
			connectorConfiguration: { host, orgName },
			connectorLoggingUrl,
			runId,
			progressCallbackUrl
		} = this.context.bindingData.input;

		const scannerCapacity = MAX_EVENT_REGISTER_CAPACITY;
		const allRepoIdsSetToRegisterEvents = [];
		for (let i = 0, j = monoReposWithSubRepos.length; i < j; i += scannerCapacity) {
			allRepoIdsSetToRegisterEvents.push(monoReposWithSubRepos.slice(i, i + scannerCapacity));
		}

		const completePartialResults = [];
		const workingGroups = [];
		for (let i = 0, j = allRepoIdsSetToRegisterEvents.length; i < j; i += maxConcurrentWorkers) {
			workingGroups.push(allRepoIdsSetToRegisterEvents.slice(i, i + maxConcurrentWorkers));
		}

		for (const workingGroup of workingGroups) {
			const output = [];
			try {
				for (const workingGroupElement of workingGroup) {
					output.push(
						this.context.df.callActivity('SendMonoRepoEventsForDORA', {
							monoReposWithSubRepos: workingGroupElement,
							host,
							ghToken,
							lxToken,
							orgName,
							metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
						})
					);
				}
				const partialResults = yield this.context.df.Task.all(output);
				completePartialResults.push(...partialResults);
			} catch (e) {
				let [limitExceeded, reset] = Util.isRateLimitExceededError(e);
				if (limitExceeded) {
					yield this.logger.logInfoFromOrchestrator(
						this.context,
						this.context.df.isReplaying,
						`GitHub GraphQL API rate limit exceeded while registering mono repo events to DORA. Attempting to automatically recover. Reset after: ${reset}`
					);
					yield* this.sleepWithTimelyIHubUpdate(`Progress 50%`);
					workingGroups.push(workingGroup);
				} else {
					throw e;
				}
			}
		}

		return completePartialResults;
	}

	*fetchReposDataConcurrently(repositoriesIds, maxConcurrentWorkers = 4) {
		const {
			secretsConfiguration: { ghToken },
			connectorConfiguration: { flags, monoRepoManifestFileName },
			connectorLoggingUrl,
			runId,
			progressCallbackUrl
		} = this.context.bindingData.input;

		const scannerCapacity = MAX_CAPACITY;
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
					this.context.df.callActivity('GetSubReposData', {
						repoIds: workingGroupElement,
						monoRepoConfig: {
							detectMonoRepos: flags.detectMonoRepos,
							manifestFileName: monoRepoManifestFileName
						},
						ghToken,
						metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
					})
				);
			}
			const partialResults = yield this.context.df.Task.all(output);
			completePartialResults.push(...partialResults);
		}

		return completePartialResults;
	}

	*fetchTeams(repositoriesIds) {
		const {
			connectorConfiguration: { orgName },
			secretsConfiguration: { ghToken },
			connectorLoggingUrl,
			runId,
			progressCallbackUrl
		} = this.context.bindingData.input;

		try {
			yield this.logger.logInfoFromOrchestrator(this.context, this.context.df.isReplaying, 'Fetching organisation teams related data');
			var teamResultsWithInitialRepos = yield this.context.df.callActivity('GetOrgTeamsData', {
				orgName,
				ghToken,
				orgRepositoriesIds: repositoriesIds,
				metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
			});
		} catch (e) {
			yield this.logger.logError(this.context, e.message);
			return [];
		}

		Util.verifyTeamReposDataLimit(teamResultsWithInitialRepos);

		try {
			const finalTeamsResult = teamResultsWithInitialRepos.filter((team) => !team.hasMoreReposInitialSet);
			if (finalTeamsResult.length !== teamResultsWithInitialRepos.length) {
				// If there are teams which have more than initially fetched repositories set
				const teamsWithMoreRepos = teamResultsWithInitialRepos.filter((team) => team.hasMoreReposInitialSet);
				const data = yield* this.fetchTeamReposConcurrently(repositoriesIds, teamsWithMoreRepos);
				finalTeamsResult.push(...data);
			}

			yield this.logger.logInfoFromOrchestrator(
				this.context,
				this.context.df.isReplaying,
				`Successfully fetched organisation teams data. Result: ${finalTeamsResult.length}`
			);
			return finalTeamsResult;
		} catch (e) {
			yield this.logger.logError(this.context, e.message);
			return [];
		}
	}

	*fetchTeamReposConcurrently(repositoriesIds, teams, maxConcurrentWorkers = 4) {
		if (!teams || !teams.length) {
			return [];
		}

		const {
			connectorConfiguration: { orgName },
			secretsConfiguration: { ghToken },
			connectorLoggingUrl,
			progressCallbackUrl,
			runId
		} = this.context.bindingData.input;

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
						this.context.df.callActivity('GetOrgTeamReposData', {
							orgName,
							ghToken,
							orgRepositoriesIds: repositoriesIds,
							team: workingGroupTeam,
							metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
						})
					);
				}
				yield this.context.df.callActivity('UpdateProgressToIHub', {
					progressCallbackUrl,
					status: iHubStatus.IN_PROGRESS,
					message: 'Progress 25%'
				});
				const partialResults = yield this.context.df.Task.all(output);
				result.push(...partialResults);
			} catch (e) {
				let [limitExceeded, reset] = Util.isRateLimitExceededError(e);
				if (limitExceeded) {
					yield this.logger.logInfoFromOrchestrator(
						this.context,
						this.context.df.isReplaying,
						`GitHub GraphQL API rate limit exceeded. Attempting to automatically recover. Reset after: ${reset}`
					);
					yield* this.sleepWithTimelyIHubUpdate(`Progress 25%`);
					workingGroups.push(workingGroup);
				} else {
					throw e;
				}
			}
		}
		return result;
	}

	*fetchRepoVisibility() {
		const {
			connectorConfiguration: { orgName },
			secretsConfiguration: { ghToken },
			connectorLoggingUrl,
			runId,
			progressCallbackUrl
		} = this.context.bindingData.input;

		let repoIdsVisibilityMap = {};
		const repoVisibilities = ['private', 'public', 'internal'];
		try {
			for (let visibilityType of repoVisibilities) {
				const visibilityRepoMap = yield this.context.df.callActivity('GetReposVisibilityData', {
					orgName,
					visibilityType,
					ghToken,
					metadata: { connectorLoggingUrl, runId, progressCallbackUrl }
				});
				repoIdsVisibilityMap = { ...repoIdsVisibilityMap, ...visibilityRepoMap };
			}
		} catch (e) {
			yield this.logger.logError(this.context, e.message);
			repoIdsVisibilityMap = {};
		}
		yield this.logger.logInfoFromOrchestrator(
			this.context,
			this.context.df.isReplaying,
			'Successfully fetched repo visibility related data'
		);
		return repoIdsVisibilityMap;
	}

	*sleepWithTimelyIHubUpdate(message, updateEveryMinutes = 10, waitForMinutes = 60) {
		const { progressCallbackUrl } = this.context.bindingData.input;

		for (let i = 0; i < Math.ceil(waitForMinutes / updateEveryMinutes); i++) {
			const elapse = (i + 1) * updateEveryMinutes;
			const deadline = DateTime.fromJSDate(this.context.df.currentUtcDateTime, { zone: 'utc' }).plus({ minutes: elapse });
			yield this.context.df.createTimer(deadline.toJSDate());
			const msg = `Connector sleeping: ${message}`;
			yield this.logger.logInfoFromOrchestrator(this.context, this.context.df.isReplaying, msg);
			yield this.context.df.callActivity('UpdateProgressToIHub', {
				progressCallbackUrl,
				status: iHubStatus.IN_PROGRESS,
				msg
			});
		}
	}
}

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl } = context.bindingData.input;
	const logger = getLoggerInstanceFromContext(context);
	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	try {
		const { connectorConfiguration, secretsConfiguration, connectorLoggingUrl, runId, bindingKey } = context.bindingData.input;
		yield context.df.callActivity('TestConnector', {
			connectorConfiguration,
			secretsConfiguration,
			connectorLoggingUrl,
			runId,
			bindingKey
		});
		const processor = new LdifProcessor(context, logger);
		const logDataMetricsInfo = yield* processor.processForLdif();
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
