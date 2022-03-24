const { graphql } = require('@octokit/graphql');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');

module.exports = async function (context, { connectorConfiguration, secretsConfiguration }) {
	if (process.env.LX_DEV_SKIP_TEST_CONNECTOR_CHECKS) {
		context.log('Skipping test connector checks. reason: LX_DEV_SKIP_TEST_CONNECTOR_CHECKS flag is enabled');
		return;
	}
	await new TestConnectorValidator(context, { connectorConfiguration, secretsConfiguration }).test();
};

class TestConnectorValidator {
	constructor(context, { connectorConfiguration, secretsConfiguration }) {
		this.context = context;
		this.connectorConfiguration = connectorConfiguration;
		this.secretsConfiguration = secretsConfiguration;
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${this.secretsConfiguration.ghToken}`
			}
		});
	}

	static checkRegexFilterList(regexFilterList) {
		if (regexFilterList) {
			try {
				// checking the provided regurlar expressions for errors
				regexFilterList.map((regexString) => new RegExp(regexString));
			} catch (error) {
				throw new Error('A regular expression provided in the input field repoNamesFilterList is invalid.');
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

	isValidManifestFileName(manifestFileName) {
		if (!manifestFileName) {
			return false;
		}
		/**
		 * Allow any valid file name with/without extension
		 * */
		const manifestFileNameRegex = /[a-zA-Z0-9-_]+\.?\S+/gs;
		return manifestFileNameRegex.test(manifestFileName);
	}

	async test() {
		const { orgName, repoNamesFilterList, flags, monoRepoManifestFileName, repoNamesFilterStrategy } = this.connectorConfiguration;
		const { ghToken } = this.secretsConfiguration;
		const logger = getLoggerInstanceFromContext(this.context);
		await logger.logInfo(this.context, 'Checking input validity and correctness');
		if (!orgName) {
			await logger.logError(this.context, 'GitHub organisation name cannot be empty');
			throw new Error('GitHub organisation name cannot be empty');
		}

		if (!ghToken) {
			await logger.logError(this.context, 'GitHub token cannot be empty');
			throw new Error('GitHub token cannot be empty');
		}

		if (repoNamesFilterStrategy && !(repoNamesFilterStrategy === 'Exclude' || repoNamesFilterStrategy === 'Include')) {
			await logger.logError(this.context, `Invalid Filter strategy selection. repoNamesFilterStrategy provided: ${repoNamesFilterStrategy}. Hint: Accepted value for repoNamesFilterStrategy is Exclude / Include`);
			throw new Error(`Filter strategy selected is Invalid, choose either Exclude or Include`);
		}

		TestConnectorValidator.checkRegexFilterList(repoNamesFilterList);
		await logger.logInfo(this.context, 'repoNamesFilterList list is valid regex array');

		if (flags && flags.detectMonoRepos && !this.isValidManifestFileName(monoRepoManifestFileName)) {
			await logger.logError(this.context, `Manifest file name can't be invalid or empty if 'detectMonoRepos' is true`);
			throw new Error(
				`Manifest file name can't be invalid or empty if 'detectMonoRepos' is true. Given: ${monoRepoManifestFileName}; Valid examples: lx-manifest.yml, lx-manifest.yaml`
			);
		}

		try {
			await this.pingForRequiredDataAccess(orgName);
			await logger.logInfo(this.context, 'orgName provided is valid');
			await logger.logInfo(this.context, 'ghToken provided has required data access permissions');
		} catch (e) {
			throw new Error(`Failed to verify source for necessary information access. Hint: Check token validity/expiry. Error: ${e.message}`);
		}
	}
}
