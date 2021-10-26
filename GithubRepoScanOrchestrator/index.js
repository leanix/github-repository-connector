﻿/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 *
 */

const df = require('durable-functions');
const { iHubStatus, checkRegexExcludeList } = require('./helper');
const { ConnectorLogger, LogStatus } = require('./connectorLogger')
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

	const repositoriesIds = yield context.df.callActivity('GetAllRepositoriesForOrg', {
		orgName,
		repoNamesExcludeListChecked,
		ghToken,
		connectorLoggingUrl
	});
	
	const workPerScanner = [];
	for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
		workPerScanner.push(repositoriesIds.slice(i, i + scannerCapacity));
	}

	const output = [];
	for (let i = 0; i < workPerScanner.length; i++) {
		// This will starts Activity Functions in parallel
		output.push(context.df.callActivity('GetSubReposData', { repoIds: workPerScanner[i], ghToken, connectorLoggingUrl }));
	}

	const partialResults = yield context.df.Task.all(output);
	try {
		var teamResults = yield context.df.callActivity('GetOrgTeamsData', {
			orgName,
			ghToken,
			connectorLoggingUrl
		});
	} catch (e) {
		logger.log(LogStatus.ERROR,e.toString());
		teamResults = [];
	}
	const repoVisibilityOutput = [];
	const repoVisibilities = ['private', 'public', 'internal'];
	for (let visibilityType of repoVisibilities) {
		repoVisibilityOutput.push(
			context.df.callActivity('GetReposVisibilityData', {
				orgName,
				visibilityType,
				ghToken,
				connectorLoggingUrl
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
		logger.log(LogStatus.ERROR, e.toString());
		repoIdsVisibilityMap = {};
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
		yield* processForLdif(logger, context);
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, { progressCallbackUrl, status: iHubStatus.FINISHED });
	} catch (e) {
		logger.log(LogStatus.ERROR,e.toString())
		logger.log(LogStatus.ERROR, "Sending FAILED Status to IHub")
		yield context.df.callActivityWithRetry('UpdateProgressToIHub', retryOptions, {
			progressCallbackUrl,
			status: iHubStatus.FAILED,
			message: e.message
		});
	}
});
