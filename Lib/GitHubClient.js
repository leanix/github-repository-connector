const { graphql } = require('@octokit/graphql');

const RETRY_WAIT = 2 * 60; // 2 minutes

class GitHubClient {
	constructor(token) {
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${token}`
			}
		});
	}

	setLogger(logger) {
		this.connectorLogger = logger;
	}

	async query(gqlRequestObject) {
		try {
			return await this.graphqlClient(gqlRequestObject);
		} catch (e) {
			if (e.name === 'GraphqlError') {
				if (parseInt(e.headers['x-ratelimit-remaining']) === 0) {
					throw new Error(`Graphql rate limit exceeded. Connector is not yet capable to recover automatically. error: ${e.message}`);
				}

				if (this.connectorLogger) {
					await this.connectorLogger.logInfo('GitHub API rate limit exceeded. Attempting to automatically recover.');
				}

				await sleep(RETRY_WAIT * 1000);
				return await this.graphqlClient(gqlRequestObject);
			}
			throw e;
		}
	}
}

async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

module.exports = GitHubClient;
