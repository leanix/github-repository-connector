/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const { iHubStatus, checkRegexExcludeList } = require('./helper');
const { ConnectorLogger } = require('./connectorLogger');
const { createLogger, log } = require('./connectorLoggerFunc');
function* processForLdif(context, logClient) {
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

	log(logClient, 'INFO', 'Created list of repos to be excluded with length: ' + repoNamesExcludeListChecked.length.toString(), context);

	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', {
		orgName,
		repoNamesExcludeListChecked,
		ghToken
	});

	log(
		logClient,
		'INFO',
		'Fetched ' + repositoriesIds.length.toString() + ' repository Ids belonging to org: ' + orgName.toString() + ' ',
		context
	);

	log(logClient, 'INFO', 'Initializing workers to fetch complete repository data for each repo Id', context);
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
	log(logClient, 'INFO', 'Fetching of repository data is now complete. Fetching teams data present in org', context);

	try {
		var teamResults = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken
		});
	} catch (e) {
		log(logClient, 'ERROR', e.toString(), context);
		teamResults = [];
	}
	log(logClient, 'ERROR', 'Fetching of org team data is now complete.', context);
	log(logClient, 'ERROR', 'Initializing workers to fetch visibility status for repos', context);
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
		log(logClient, 'ERROR', 'Successfully fetched repo visibility status for all repos', context);
	} catch (e) {
		log(logClient, 'ERROR', e.toString(), context);
		repoIdsVisibilityMap = {};
	}
	log(logClient, 'ERROR', 'Sending IN_PROGRESS status to IHub', context);
	yield context.df.callActivity('UpdateProgressToIHub', {
		progressCallbackUrl,
		status: iHubStatus.IN_PROGRESS,
		message: 'Successfully requested the data from GitHub'
	});
	log(logClient, 'ERROR', 'Initializing LDIF creation...', context);
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

	const logClient = createLogger(connectorLoggingUrl);

	try {
		log(logClient, 'INFO', 'Started process for LDIF creation', context);
		yield* processForLdif(context, logClient);
		log(logClient, 'INFO', 'Sending FINISHED Status to IHub', context);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, { progressCallbackUrl, status: iHubStatus.FINISHED });
	} catch (e) {
		log(logClient, 'INFO', e.toString(), context);
		log(logClient, 'INFO', 'Sending FAILED Status to IHub', context);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FAILED,
			message: e.message
		});
	}
});
