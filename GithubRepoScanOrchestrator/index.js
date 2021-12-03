/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const { ConnectorLoggerFactory } = require('../Lib/connectorLogger');
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
	const scannerCapacity = 100;

	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Starting 'GetAllRepositoriesForOrg' to fetch all repo Ids");
	}

	const repoNamesExcludeListChecked = repoNamesExcludeList ? repoNamesExcludeList : [];
	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', {
		orgName,
		repoNamesExcludeListChecked,
		ghToken,
		connectorLoggingUrl,
		runId
	});

	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Completed 'GetAllRepositoriesForOrg' execution.");
		yield logger.logInfo(context, "Starting 'GetSubReposData' to fetch all repos complete data");
	}

	const workPerScanner = [];
	for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
		workPerScanner.push(repositoriesIds.slice(i, i + scannerCapacity));
	}

	const output = [];
	for (let i = 0; i < workPerScanner.length; i++) {
		// This will starts Activity Functions in parallel
		output.push(context.df.callActivity('GetSubReposData', { repoIds: workPerScanner[i], ghToken }));
	}

	const partialResults = yield context.df.Task.all(output);

	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Completed 'GetSubReposData' execution.");
	}

	try {
		if (flags && !flags.importTeams) {
			teamResults = [];
		} else {
			if (!context.df.isReplaying) {
				yield logger.logInfo(context, "Starting 'GetOrgTeamsData' to fetch teams related data");
			}
			var teamResults = yield context.df.callActivity('GetOrgTeamsData', {
				orgName,
				ghToken,
				orgRepositoriesIds: repositoriesIds,
				connectorLoggingUrl,
				runId
			});
			if (!context.df.isReplaying) {
				yield logger.logInfo(context, "Completed 'GetOrgTeamsData' execution.");
			}
		}
	} catch (e) {
		context.log(e);
		yield logger.logError(context, e.message);
		teamResults = [];
	}
	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Starting 'GetReposVisibilityData' to fetch repo visibility related data");
	}
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
	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Completed 'GetReposVisibilityData' execution.");
		yield logger.logInfo(context, "Starting 'SaveLdifToStorage' to generate LDIF and save it into blob storage url.");
	}
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Successfully requested the data from GitHub'
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
	if (!context.df.isReplaying) {
		yield logger.logInfo(context, "Completed 'SaveLdifToStorage' execution.");
	}
}

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl } = context.bindingData.input;
	const logger = ConnectorLoggerFactory.getConnectorLogger();
	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	try {
		yield context.df.callActivity('TestConnector', context.bindingData.input);
		yield* processForLdif(context, logger);
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
