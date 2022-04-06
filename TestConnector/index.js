const { graphql } = require('@octokit/graphql');
const Util = require('../Lib/helper');
const jwt_decode = require('jwt-decode');
const { getLoggerInstanceFromContext } = require('../Lib/connectorLogger');
const axios = require('axios');

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

	async isFeatureFlagEnabled(bearerToken, featureFlag) {
		const workspaceId = this.input.bindingKey.lxWorkspace;
		const host = this.input.connectorConfiguration.host;
		return await axios
			.get(`https://${host}/services/mtm/v1/workspaces/${workspaceId}/featureBundle`, {
				headers: { Authorization: `Bearer ${bearerToken}` }
			})
			.then((axiosResponse) => axiosResponse.data.data)
			.then((featureBundle) => featureBundle.features.find((f) => f.id === featureFlag))
			.then((vsmFeature) => {
				this.context.log(`Test connector: Find result for ${featureFlag} feature in feature bundle - ${JSON.stringify(vsmFeature)}`);
				return !!(vsmFeature.status && vsmFeature.status === 'ENABLED');
			})
			.catch((e) => {
				throw new Error(`Failed to check for DORA feature flag status on the workspace. Error: ${e.message}`);
			});
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

	async isValidWorkspaceToken(host, lxToken, workspaceId) {
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

	isValidHostName(host) {
		if (!host) {
			return false;
		}
		/**
		 * Allow any valid file name with/without extension
		 * */
		const hostNameRegex = /\w+-*\w+.leanix.net/gs;
		return hostNameRegex.test(host);
	}

	isValidLxToken(lxToken) {
		if (!lxToken) {
			return false;
		}
		/**
		 * Allow any valid file name with/without extension
		 * */
		const lxTokenRegex = /\w{40}/gs;
		return lxTokenRegex.test(lxToken);
	}

	async test() {
		const { orgName, repoNamesExcludeList, repoNamesIncludeList, flags, monoRepoManifestFileName, repoNamesFilterStrategy, host } =
			this.input.connectorConfiguration;
		const { ghToken, lxToken } = this.input.secretsConfiguration;
		const workspaceId = this.input.bindingKey.lxWorkspace;
		const DORA_FEATURE_FLAG = 'integration.vsm.dora';
		const logger = getLoggerInstanceFromContext(this.context);
		let repoNamesFilterList;
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
			await logger.logError(
				this.context,
				`Invalid Filter strategy selection. repoNamesFilterStrategy provided: ${repoNamesFilterStrategy}. Hint: Accepted value for repoNamesFilterStrategy is Exclude / Include`
			);
			throw new Error(`Filter strategy selected is Invalid, choose either Exclude or Include`);
		}

		if (repoNamesFilterStrategy === 'Exclude') {
			repoNamesFilterList = repoNamesExcludeList;
		} else {
			repoNamesFilterList = repoNamesIncludeList;
		}

		TestConnectorValidator.checkRegexFilterList(repoNamesFilterList);
		await logger.logInfo(this.context, 'repoNamesFilterList list is valid regex array');

		if (flags && flags.detectMonoRepos && !this.isValidManifestFileName(monoRepoManifestFileName)) {
			await logger.logError(this.context, `Manifest file name can't be invalid or empty if 'detectMonoRepos' is true`);
			throw new Error(
				`Manifest file name can't be invalid or empty if 'detectMonoRepos' is true. Given: ${monoRepoManifestFileName}; Valid examples: lx-manifest.yml, lx-manifest.yaml`
			);
		}

		if (flags && flags.sendEventsForDORA) {
			const isValidHost = await this.isValidHostName(host);
			if (!isValidHost) {
				await logger.logError(this.context, `Host name provided is NOT valid`);
				throw new Error(
					`Failed! Error: Host name provided is either empty or NOT valid. Hint: Please make sure your host name ends with '<XYZ>.leanix.net' `
				);
			}

			const isValidLxToken = await this.isValidLxToken(host);
			if (!isValidLxToken) {
				await logger.logError(this.context, `lxToken provided is NOT valid`);
				throw new Error(
					`Failed! Error: lxToken provided is either empty or NOT valid. Hint: Please make sure to create a correct technical user token with admin permissions`
				);
			}

			const isDoraFeatureFlagEnabled = await this.isFeatureFlagEnabled(await Util.getAccessToken(host, lxToken), DORA_FEATURE_FLAG);
			if (!isDoraFeatureFlagEnabled) {
				await logger.logError(this.context, `${DORA_FEATURE_FLAG} Feature flag is not ENABLED on workspace ${workspaceId}`);
				throw new Error(
					`Failed! Error: Feature Flag for Dora is not Enabled. Hint: Please enable activate DORA integration from 'Integrations' tab. You could also contact your CSM to enable ${DORA_FEATURE_FLAG} `
				);
			}
			const isValidWorkspaceToken = await this.isValidWorkspaceToken(host, lxToken, workspaceId);
			if (!isValidWorkspaceToken) {
				await logger.logError(
					this.context,
					`Failed! Error: lxToken provided belongs to a different workspace. Hint: Please provide lxToken belonging to current workspace Id = ${workspaceId} `
				);
				throw new Error(
					`Failed! Error: lxToken provided belongs to a different workspace. Hint: Please provide lxToken belonging to current workspace Id = ${workspaceId} `
				);
			}
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
