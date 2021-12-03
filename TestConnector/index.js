﻿const { graphql } = require('@octokit/graphql');
const ConnectorLogger = require('../Lib/connectorLogger');

module.exports = async function (context, { connectorConfiguration, secretsConfiguration }) {
	if (process.env.LX_DEV_SKIP_TEST_CONNECTOR_CHECKS) {
		context.log('Skipping test connector checks. reason: LX_DEV_SKIP_TEST_CONNECTOR_CHECKS flag is enabled');
		return;
	}
	await new TestConnectorValidator(context, { connectorConfiguration, secretsConfiguration }).test();
};

class TestConnectorValidator {
	constructor(context, { connectorConfiguration, secretsConfiguration }) {
		context.log('INSIDE TEST CONNECTOR', context.bindingData);
		this.context = context;
		this.connectorConfiguration = connectorConfiguration;
		this.secretsConfiguration = secretsConfiguration;
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${this.secretsConfiguration.ghToken}`
			}
		});
	}

	static checkRegexExcludeList(regexExcludeList) {
		if (regexExcludeList) {
			try {
				// checking the provided regurlar expressions for errors
				regexExcludeList.map((regexString) => new RegExp(regexString));
			} catch (error) {
				throw new Error('A regular expression provided in the input field repoNamesExcludeList is invalid.');
			}
		}
	}

	async pingForRequiredDataAccess(orgName) {
		await this.graphqlClient({
			query: `
          query basic($orgName: String!) {
                viewer {
                  login
                }
                organization(login: $orgName) {
                	id
              	}
              }
					`,
			orgName
		});
	}

	async test() {
		const { orgName, repoNamesExcludeList } = this.connectorConfiguration;
		const { ghToken } = this.secretsConfiguration;
		const logger = new ConnectorLogger(this.context.bindingData.connectorLoggingUrl, this.context.bindingData.runId);
		logger.logInfo(this.context, 'Checking input validity and correctness');
		if (!orgName) {
			logger.logError(this.context, 'GitHub organisation name cannot be empty');
			throw new Error('GitHub organisation name cannot be empty');
		}

		if (!ghToken) {
			logger.logError(this.context, 'GitHub token cannot be empty');
			throw new Error('GitHub token cannot be empty');
		}
		logger.logInfo(this.context, 'orgName is not empty');
		logger.logInfo(this.context, 'ghToken is not empty');

		TestConnectorValidator.checkRegexExcludeList(repoNamesExcludeList);
		logger.logInfo(this.context, 'repoNamesExcludeList list is valid regex array');

		try {
			await this.pingForRequiredDataAccess(orgName);
			logger.logInfo(this.context, 'orgName provided is valid');
		} catch (e) {
			throw new Error(`Failed to verify source for necessary information access. Hint: Check token validity/expiry. Error: ${e.message}`);
		}
	}
}
