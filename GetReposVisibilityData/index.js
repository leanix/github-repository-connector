const { graphql } = require('@octokit/graphql');
const { ConnectorLogger, LogStatus } = require('../GithubRepoScanOrchestrator/connectorLogger');
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
 * @param {graphql} graphqlClient
 * @param {Object} param1
 * @param {String} visibilityType
 */
async function getPagedRepoIdsForVisibility(graphqlClient, { searchQuery, cursor }, visibilityType) {
	const initialRepoPageSize = 100;
	const data = await graphqlClient({
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
 * @param {graphql} graphqlClient
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

module.exports = async function (context, { orgName, visibilityType, ghToken, connectorLoggingUrl }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});
	const logger = new ConnectorLogger(connectorLoggingUrl, context);
	await logger.log(LogStatus.INFO, 'Started fetching repo visibility data for subset of repo ids');
	const visibilityResult = await getReposForVisibility(graphqlClient, orgName, visibilityType);
	await logger.log(LogStatus.INFO, 'Completed fetching repo visibility data for subset of repo ids');
	context.done(null, visibilityResult);
};
