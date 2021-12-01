/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const { checkRegexExcludeList } = require('../Lib/helper');
const iHubStatus = require('../Lib/IHubStatus');
const logStatus = require('../Lib/connectorLogStatus');
const ConnectorLogger = require('../Lib/connectorLogger');
function* processForLdif(context, logger) {
	const {
		connectorConfiguration: { orgName, repoNamesExcludeList },
		secretsConfiguration: { ghToken },
		ldifResultUrl,
		progressCallbackUrl,
		bindingKey
	} = context.bindingData.input;
	const scannerCapacity = 100;

	const repoNamesExcludeListChecked = checkRegexExcludeList(repoNamesExcludeList);
	if (!context.df.isReplaying) {
		yield logger.log(context, logStatus.INFO, 'Regex validation completed');
	}
	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', { orgName, repoNamesExcludeListChecked, ghToken });
	if (!context.df.isReplaying) {
		yield logger.log(context, logStatus.INFO, 'All repo Ids fetching is completed');
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
		yield logger.log(context, logStatus.INFO, 'All repo data fetching is completed');
	}
	try {
		var teamResults = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken,
			orgRepositoriesIds: repositoriesIds
		});
	} catch (e) {
		context.log(e);
		if (!context.df.isReplaying) {
			yield logger.log(context, logStatus.ERROR, e.message);
		}
		teamResults = [];
	}
	if (!context.df.isReplaying) {
		yield logger.log(context, logStatus.INFO, 'All Team data fetching is completed');
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
		yield logger.log(context, logStatus.ERROR, e.message);
		repoIdsVisibilityMap = {};
	}
	if (!context.df.isReplaying) {
		yield logger.log(context, logStatus.INFO, 'All Repos visibility data fetching is completed');
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
			orgName
		}
	});
	if (!context.df.isReplaying) {
		yield logger.log(context, logStatus.INFO, 'Saving to LDIF is completed');
	}
}

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl } = context.bindingData.input;
	const logger = ConnectorLogger.getConnectorLogger(context);
	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	try {
		// add ihub test connector validations here
		if (!context.df.isReplaying) {
			yield logger.log(context, logStatus.INFO, 'Calling processForLdif method');
		}
		yield* processForLdif(context, logger);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, { progressCallbackUrl, status: iHubStatus.FINISHED });
	} catch (e) {
		context.log(e);
		yield logger.log(context, logStatus.ERROR, e.message);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FAILED,
			message: e.message
		});
	}
});
