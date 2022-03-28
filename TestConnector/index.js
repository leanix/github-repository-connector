const { graphql } = require('@octokit/graphql');
const Util = require('../Lib/helper');
const jwt_decode = require('jwt-decode');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');

module.exports = async function (context, input) {
	if (process.env.LX_DEV_SKIP_TEST_CONNECTOR_CHECKS) {
		context.log('Skipping test connector checks. reason: LX_DEV_SKIP_TEST_CONNECTOR_CHECKS flag is enabled');
		return;
	}
	await new TestConnectorValidator(context, input).test();
};

class TestConnectorValidator {
	constructor(context, input) {
		this.context = context;
		this.input = input;
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${this.input.secretsConfiguration.ghToken}`
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

	async isValidWorkspaceToken({ host, lxToken, workspaceId }) {
		try {
			var bearerToken = await Util.getAccessToken(host, lxToken);
			var decoded = jwt_decode(bearerToken);
			if (decoded.principal.permission.workspaceId != workspaceId) {
				return false;
			}
		} catch (error) {
			throw new Error(`Failed! Hint: Check if lxToken is not expired, and if host is valid. error: ${error.message}`);
		}
		return true;
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
		const { orgName, repoNamesExcludeList, flags, monoRepoManifestFileName, host } = this.input.connectorConfiguration;
		const { ghToken, lxToken } = this.input.secretsConfiguration;
		const { workspaceId } = this.bindingKey.lxWorkspace;
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

		TestConnectorValidator.checkRegexExcludeList(repoNamesExcludeList);
		await logger.logInfo(this.context, 'repoNamesExcludeList list is valid regex array');

		if (flags && flags.detectMonoRepos && !this.isValidManifestFileName(monoRepoManifestFileName)) {
			await logger.logError(this.context, `Manifest file name can't be invalid or empty if 'detectMonoRepos' is true`);
			throw new Error(
				`Manifest file name can't be invalid or empty if 'detectMonoRepos' is true. Given: ${monoRepoManifestFileName}; Valid examples: lx-manifest.yml, lx-manifest.yaml`
			);
		}

		if (flags && flags.sendEventsForDORA && !this.isValidWorkspaceToken(host, lxToken, workspaceId)) {
			await logger.logError(
				this.context,
				`Failed! Error: lxToken provided belongs to a different workspace. Hint: Please provide lxToken belonging to current workspace Id = ${workspaceId} `
			);
			throw new Error(
				`Failed! Error: lxToken provided belongs to a different workspace. Hint: Please provide lxToken belonging to current workspace Id = ${workspaceId} `
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
