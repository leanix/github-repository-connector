﻿const { graphql } = require('@octokit/graphql');

function excludeListedRepositoriesIDsList(repositoriesData, repoNamesExcludeListChecked) {
	const regexExcludeListArray = repoNamesExcludeListChecked.map((regexString) => new RegExp(regexString));
	let remainingRepoIdsArray = repositoriesData
		.filter((repoData) => !regexExcludeListArray.find((regex) => repoData.name.match(regex)))
		.map((repoData) => repoData.id);
	return remainingRepoIdsArray;
}

async function getRepositoriesIds(graphqlClient, { orgName, pageCount, cursor }, repoNamesExcludeListChecked) {
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

	const idList = excludeListedRepositoriesIDsList(data.organization.repositories.nodes, repoNamesExcludeListChecked);

	return {
		ids: idList,
		pageInfo: data.organization.repositories.pageInfo
	};
}

async function getAllRepositoryIds(graphqlClient, orgName, repoNamesExcludeListChecked) {
	let cursor = null;
	let finalResult = [];

	do {
		var { ids, pageInfo } = await getRepositoriesIds(
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
	return finalResult;
}

module.exports = async function (context, { orgName, repoNamesExcludeListChecked, ghToken }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});

	const finalResult = await getAllRepositoryIds(graphqlClient, orgName, repoNamesExcludeListChecked);

	if(!finalResult || !finalResult.length) {
		throw new Error(`Zero repositories found in ${orgName} GitHub organisation.`)
	}

	context.done(null, finalResult);
};
