const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');
const GitHubClient = require('../Lib/GitHubClient');

class GetAllRepositoriesForOrgHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient = graphqlClient;
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
	}

	excludeListedRepositoriesIDsList(repositoriesData, repoNamesExcludeListChecked) {
		const regexExcludeListArray = repoNamesExcludeListChecked.map((regexString) => new RegExp(regexString));
		return repositoriesData
			.filter((repoData) => !regexExcludeListArray.find((regex) => repoData.name.match(regex)))
			.map((repoData) => repoData.id);
	}

	async getRepositoriesIds({ orgName, pageCount, cursor }, repoNamesExcludeListChecked) {
		const data = await this.graphqlClient.query({
			query: `
				query getOrgRepositories($orgName: String!, $pageCount: Int!, $cursor: String) {
				  organization(login: $orgName) {
					repositories(first: $pageCount, after: $cursor) {
					  pageInfo {
						endCursor
						hasNextPage
					  }
					  nodes {
						id
						name
						isArchived
					  }
					}
				  }
				}
			`,
			orgName,
			pageCount,
			cursor
		});

		const idList = this.excludeListedRepositoriesIDsList(data.organization.repositories.nodes, repoNamesExcludeListChecked);

		return {
			ids: idList,
			pageInfo: data.organization.repositories.pageInfo
		};
	}

	async getAllRepositoryIds(orgName, repoNamesExcludeListChecked) {
		let cursor = null;
		let finalResult = [];

		do {
			var { ids, pageInfo } = await this.getRepositoriesIds(
				{
					orgName,
					pageCount: 100,
					cursor
				},
				repoNamesExcludeListChecked
			);
			finalResult = finalResult.concat(ids);
			cursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		if (!finalResult || !finalResult.length) {
			await this.logger.logError(this.context, `Zero repositories found in ${orgName} GitHub organisation.`);
			throw new Error(`Zero repositories found in ${orgName} GitHub organisation.`);
		}

		await this.logger.logInfo(this.context, `Fetched Org Repositories Ids. Result : ${finalResult.length.toString()} repos`);

		return finalResult;
	}
}

module.exports = async function (
	context,
	{ orgName, repoNamesExcludeListChecked, ghToken, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	let handler = new GetAllRepositoriesForOrgHandler(context, connectorLoggingUrl, progressCallbackUrl, runId, new GitHubClient(ghToken));
	return await handler.getAllRepositoryIds(orgName, repoNamesExcludeListChecked);
};
