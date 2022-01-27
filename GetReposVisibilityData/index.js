const GitHubClient = require('../Lib/GitHubClient');

/**
 *
 * @param {Array} repoNodes
 * @param {String} visibilityType
 */

function getRepoIdsVisibilityMap(repoNodes, visibilityType) {
	let repoIdsVisibilityMap = {};
	for (let node of repoNodes) {
		repoIdsVisibilityMap[node.id] = visibilityType;
	}
	return repoIdsVisibilityMap;
}

/**
 *
 * @param {GitHubClient} graphqlClient
 * @param {Object} param1
 * @param {String} visibilityType
 */
async function getPagedRepoIdsForVisibility(graphqlClient, { searchQuery, cursor }, visibilityType) {
	const initialRepoPageSize = 100;
	const data = await graphqlClient.query({
		query: `query getOrgRepoVisibility($searchQuery: String!, $pageCount: Int!, $cursor: String) {
                    search(query: $searchQuery, type: REPOSITORY, first: $pageCount, after:$cursor) {
                    repositoryCount
                    pageInfo{
                        endCursor
                        hasNextPage
                    }
                    nodes{
                        ... on Repository{
                                id        
                            }
                        }
                    }
                }   
        `,
		searchQuery,
		pageCount: initialRepoPageSize,
		cursor
	});

	return {
		result: getRepoIdsVisibilityMap(data.search.nodes, visibilityType),
		pageInfo: data.search.pageInfo
	};
}

/**
 *
 * @param {GitHubClient} graphqlClient
 * @param {String} orgName
 * @param {String} visibilityType
 */
async function getReposForVisibility(graphqlClient, orgName, visibilityType) {
	let repoVisibilityCursor = null;
	let finalResultForVisibility = [];
	const searchQuery = `org:${orgName} is:${visibilityType} fork:true`;

	do {
		var { result, pageInfo } = await getPagedRepoIdsForVisibility(
			graphqlClient,
			{ searchQuery: searchQuery, cursor: repoVisibilityCursor },
			visibilityType
		);
		finalResultForVisibility = { ...finalResultForVisibility, ...result };
		repoVisibilityCursor = pageInfo.endCursor;
	} while (pageInfo.hasNextPage);

	return finalResultForVisibility;
}

module.exports = async function (context, { orgName, visibilityType, ghToken }) {
	const visibilityResult = await getReposForVisibility(new GitHubClient(ghToken), orgName, visibilityType);

	context.done(null, visibilityResult);
};
