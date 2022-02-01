const { graphql } = require('@octokit/graphql');
const UpdateProgressToIHub = require('../UpdateProgressToIHub');
const IHubStatus = require('../Lib/IHubStatus');

const RETRY_WAIT = 7 * 60; // 7 minutes

class GitHubClient {
	constructor(token) {
		this.graphqlClient = graphql.defaults({
			headers: {
				authorization: `token ${token}`
			}
		});
	}

	setLogger(logger, context, progressCallbackUrl) {
		this.connectorLogger = logger;
		this.context = context;
		this.progressCallbackUrl = progressCallbackUrl;
	}

	async query(gqlRequestObject) {
		try {
			return await this.graphqlClient(gqlRequestObject);
		} catch (e) {
			if (e.name === 'HttpError' && (e.message.includes('secondary rate limit') || e.message.includes('EAI_AGAIN'))) {
				if (this.connectorLogger) {
					await this.connectorLogger.logInfo(this.context, 'GitHub API rate limit exceeded. Attempting to automatically recover.');
				}
				await UpdateProgressToIHub(this.context, {
					progressCallbackUrl: this.progressCallbackUrl,
					status: IHubStatus.IN_PROGRESS,
					message: 'Connector Idle: Automatically recovering from rate limiting'
				});
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
