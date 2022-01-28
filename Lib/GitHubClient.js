const { graphql } = require('@octokit/graphql');

const RETRY_WAIT = 7 * 60; // 7 minutes

class GitHubClient {
	constructor(token) {
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${token}`
			}
		});
	}

	setLogger(logger, context) {
		this.connectorLogger = logger;
		this.context = context;
	}

	async query(gqlRequestObject) {
		try {
			return await this.graphqlClient(gqlRequestObject);
		} catch (e) {
			if (e.name === 'HttpError' && e.message.includes('secondary rate limit')) {
				if (this.connectorLogger) {
					await this.connectorLogger.logInfo(this.context, 'GitHub API rate limit exceeded. Attempting to automatically recover.');
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
