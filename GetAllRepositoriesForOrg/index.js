/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {graphql} = require("@octokit/graphql");

async function getRepositoriesIds(graphqlClient, {queryString, pageCount, cursor}) {
    const data = await graphqlClient({
        query: `
            query getOrgRepositories($queryString: String!, $pageCount: Int!, $cursor: String) {
              organization(login: $queryString) {
                repositories(first: $pageCount, after: $cursor) {
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                  nodes {
                    id
                  }
                }
              }
            }
        `,
        queryString,
        pageCount,
        cursor
    });

    return {
        ids: data.organization.repositories.nodes.map(e => e.id),
        pageInfo: data.organization.repositories.pageInfo
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
    const graphqlClient = graphql.defaults({
        headers: {
            authorization: `token ${process.env['ghToken']}`,
        },
    });

    const finalResult = await getAllRepositoryIds(graphqlClient, orgName);
    context.done(null, finalResult);
};
