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
				await this.connectorLogger.logInfo('Github rate limit error. Retrying..');
				// e.headers.retryAfter
				// check for retryAfter/ rate limit error and try for some period
			}
			throw e;
		}
	}
}

module.exports = GitHubClient;
