const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');
const GitHubClient = require('../Lib/GitHubClient');

class GetAllRepositoriesForOrgHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient = graphqlClient;
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
	}

	filterListedRepositoriesIDsList(repositoriesData, repoNamesFilterListChecked, repoNamesFilterStrategy) {
		const regexExcludeListArray = repoNamesFilterListChecked.map((regexString) => new RegExp(regexString));
		return repositoriesData
			.filter((repoData) => repoNamesFilterStrategy === 'Exclude' ? !regexExcludeListArray.find((regex) => repoData.name.match(regex)) : regexExcludeListArray.find((regex) => repoData.name.match(regex)))
			.map((repoData) => repoData.id);
	}

	async getRepositoriesIds({ orgName, pageCount, cursor }, repoNamesFilterListChecked, repoNamesFilterStrategy) {
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
					  }
					}
				  }
				}
			`,
			orgName,
			pageCount,
			cursor
		});

		const idList = this.filterListedRepositoriesIDsList(data.organization.repositories.nodes, repoNamesFilterListChecked, repoNamesFilterStrategy);

		return {
			ids: idList,
			pageInfo: data.organization.repositories.pageInfo
		};
	}

	async getAllRepositoryIds(orgName, repoNamesFilterListChecked, repoNamesFilterStrategy) {
		let cursor = null;
		let finalResult = [];

		do {
			var { ids, pageInfo } = await this.getRepositoriesIds(
				{
					orgName,
					pageCount: 100,
					cursor
				},
				repoNamesFilterListChecked,
				repoNamesFilterStrategy
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
	{ orgName, repoNamesFilterListChecked, repoNamesFilterStrategy, ghToken, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	let handler = new GetAllRepositoriesForOrgHandler(context, connectorLoggingUrl, progressCallbackUrl, runId, new GitHubClient(ghToken));
	return await handler.getAllRepositoryIds(orgName, repoNamesFilterListChecked, repoNamesFilterStrategy);
};
