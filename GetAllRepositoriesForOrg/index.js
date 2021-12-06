const { graphql } = require('@octokit/graphql');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');

class GetAllRepositoriesForOrgHandler {
	constructor(context, connectorLoggingUrl, runId) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
	}

	excludeListedRepositoriesIDsList(repositoriesData, repoNamesExcludeListChecked) {
		const regexExcludeListArray = repoNamesExcludeListChecked.map((regexString) => new RegExp(regexString));
		let remainingRepoIdsArray = repositoriesData
			.filter((repoData) => !regexExcludeListArray.find((regex) => repoData.name.match(regex)))
			.map((repoData) => repoData.id);
		return remainingRepoIdsArray;
	}

	async getRepositoriesIds(graphqlClient, { orgName, pageCount, cursor }, repoNamesExcludeListChecked) {
		const data = await graphqlClient({
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

		const idList = this.excludeListedRepositoriesIDsList(data.organization.repositories.nodes, repoNamesExcludeListChecked);

		return {
			ids: idList,
			pageInfo: data.organization.repositories.pageInfo
		};
	}

	async getAllRepositoryIds(graphqlClient, orgName, repoNamesExcludeListChecked) {
		let cursor = null;
		let finalResult = [];

		do {
			var { ids, pageInfo } = await this.getRepositoriesIds(
				graphqlClient,
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

module.exports = async function (context, { orgName, repoNamesExcludeListChecked, ghToken, metadata: { connectorLoggingUrl, runId } }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});
	let handler = new GetAllRepositoriesForOrgHandler(context, connectorLoggingUrl, runId);
	const finalResult = await handler.getAllRepositoryIds(graphqlClient, orgName, repoNamesExcludeListChecked);
	context.done(null, finalResult);
};
