/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const { iHubStatus, checkRegexExcludeList } = require('./helper');
const { ConnectorLogger } = require('./connectorLogger')
function* processForLdif(logger, context) {
	const {
		connectorConfiguration: { orgName, repoNamesExcludeList },
		secretsConfiguration: { ghToken },
		ldifResultUrl,
		progressCallbackUrl,
		connectorLoggingUrl,
		bindingKey
	} = context.bindingData.input;
	const scannerCapacity = 100;

	const repoNamesExcludeListChecked = checkRegexExcludeList(repoNamesExcludeList);

	yield* logger.log("Created list of repos to be excluded with length: "+repoNamesExcludeListChecked.length.toString())

	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', {
		orgName,
		repoNamesExcludeListChecked,
		ghToken
	});
	
	yield* logger.log("Fetched "+repositoriesIds.length.toString() +" repository Ids belonging to org: "+orgName.toString()+" ")
	yield* logger.log("Initializing workers to fetch complete repository data for each repo Id")
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
	yield* logger.log("Fetching of repository data is now complete. Fetching teams data present in org")
	try {
		var teamResults = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken
		});
	} catch (e) {
		logger.log(e);
		teamResults = [];
	}
	yield logger.log("Fetching of org team data is now complete.")
	yield logger.log("Initializing workers to fetch visibility status for repos")
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
		logger.log("Successfully fetched repo visibility status for all repos")
	} catch (e) {
		logger.log(e);
		repoIdsVisibilityMap = {};
	}
	yield logger.log("Sending IN_PROGRESS status to IHub")
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Successfully requested the data from GitHub'
	});
	logger.log("Initializing LDIF creation...")
	yield context.df.callActivity('SaveLdifToStorage', {
		partialResults,
		teamResults,
		repoIdsVisibilityMap,
		blobStorageSasUrl: ldifResultUrl,
		bindingKey,
		connectorLoggingUrl
	});
}

module.exports = df.orchestrator(function* (context) {
	const { progressCallbackUrl, connectorLoggingUrl } = context.bindingData.input;

	const retryOptions = new df.RetryOptions(5000, 3);
	retryOptions.maxRetryIntervalInMilliseconds = 5000;

	const logger = new ConnectorLogger(connectorLoggingUrl, context)

	try {
		yield* logger.log("Started process for LDIF creation")
		yield* processForLdif(logger, context);
		yield logger.log("Sending FINISHED Status to IHub")
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, { progressCallbackUrl, status: iHubStatus.FINISHED });
	} catch (e) {
		logger.log(e.toString())
		logger.log("Sending FAILED Status to IHub")
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FAILED,
			message: e.message
		});
	}
});
