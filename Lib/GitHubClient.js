const { graphql, GraphqlResponseError } = require('@octokit/graphql');

class GitHubClient {
	graphqlClient;
	connectorLogger;

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
			if (e instanceof GraphqlResponseError) {
				await this.connectorLogger.logInfo('GitHub rate limit exceeded. Attempting to automatically recover.');
        const retryAfterSeconds = e.headers ? e.headers['Retry-After'] : e.headers['Retry-After'] ? e.headers['Retry-After']: 2 * 60;
        await sleep(retryAfterSeconds);
        return await this.graphqlClient(gqlRequestObject);
			}
			throw e;
		}
	}
}

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  })
}

module.exports = GitHubClient;
