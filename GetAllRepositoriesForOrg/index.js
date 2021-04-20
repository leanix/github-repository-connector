/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {graphql} = require("@octokit/graphql");

const graphqlClient = graphql.defaults({
    headers: {
        authorization: `token ${process.env['ghToken']}`,
    },
});

async function getRepositoriesIds(graphqlClient, {queryString, pageCount, cursor}) {
    const data = await graphqlClient({
        query: `
            query getOrgRepositories($queryString: String!, $pageCount: Int!, $cursor: String) {
              search(query: $queryString, type: REPOSITORY, first: $pageCount, after: $cursor) {
                edges {
                  node {
                    ... on Repository {
                      id
                    }
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
        `,
        queryString,
        pageCount,
        cursor
    });

    return {
        ids: data.search.edges.map(e => e.node.id),
        pageInfo: data.search.pageInfo
    };
}

async function getAllRepositoryIds(graphqlClient, queryString) {
    let cursor = null;
    let finalResult = [];

    do {
        var {ids, pageInfo} = await getRepositoriesIds(graphqlClient, {queryString, pageCount: 100, cursor});
        finalResult = finalResult.concat(ids);
        cursor = pageInfo.endCursor;
    } while (pageInfo.hasNextPage);
    return finalResult;
}

module.exports = async function (context, {orgName}) {
    // retrieves all ids of an organisation

    const queryString = `org:${orgName}`;
    const finalResult = await getAllRepositoryIds(graphqlClient, queryString);
    context.done(null, finalResult);
};
