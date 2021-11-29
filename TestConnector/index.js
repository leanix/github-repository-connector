const { graphql } = require('@octokit/graphql');

module.exports = async function (context, { connectorConfiguration, secretsConfiguration }) {
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
          query($orgName: String!) {
                viewer {
                  login
                }
              },
              organization(login: $orgName) {
                id
              },
					`,
			orgName
		});
	}

	async test() {
		const { orgName, repoNamesExcludeList } = this.connectorConfiguration;
		const { ghToken } = this.secretsConfiguration;

		if (!orgName) {
			throw new Error('GitHub organisation name cannot be empty');
		}

		if (!ghToken) {
			throw new Error('GitHub token cannot be empty');
		}

		TestConnectorValidator.checkRegexExcludeList(repoNamesExcludeList);

		try {
			await this.pingForRequiredDataAccess(orgName);
		} catch (e) {
			throw new Error(`Failed to verify source for necessary information access. Error: ${e.message}`);
		}
	}
}
