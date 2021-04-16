/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {graphql} = require("@octokit/graphql");

module.exports = async function (context, {orgName, ghToken}) {
    // retrieves all ids of an organisation
    const data = await graphql({
        query: `
            query getOrgRepositories($queryString: String!) {
              search(query: $queryString, type: REPOSITORY, first: 5) {
                repositoryCount
                edges {
                  node {
                    ... on Repository {
                      id
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  startCursor
                }
              }
            }
        `,
        queryString: `org:${orgName}`,
        headers: {
            authorization: `token ${ghToken}`,
        },
    });
    const finalData = data.search.edges.map(e => e.node.id)
    context.done(null, finalData);
};
