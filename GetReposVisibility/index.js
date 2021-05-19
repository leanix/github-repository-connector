/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */
const {graphql} = require("@octokit/graphql");

// the three types of visibilities present in github
const REPO_VISIBILITY_PRIVATE = 'private'
const REPO_VISIBILITY_PUBLIC = 'public'
const REPO_VISIBILITY_INTERNAL = 'internal'

async function getPagedRepoIdsForVisibility(graphqlClient, {searchQuery, cursor}, visibilityType) {
    // fetching 100 repo ids for every call
    const initialRepoPageSize = 100;
    const data = await graphqlClient({
        query: `query getOrgRepoVisibilty($searchQuery: String!, $pageCount: Int!, $cursor: String) {
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

    /*
        Creating a map with key as repo id and visibility as value
        sending this map object in result
    */

    let repoIdsVisibilityMap = {}
    for (let node of data.search.nodes) {
        repoIdsVisibilityMap[node.id] = visibilityType
    }

    return {
        result: repoIdsVisibilityMap,
        pageInfo: data.search.pageInfo
    };
}

async function getReposForVisibility(graphqlClient, orgName, visibilityType) {
    let repoVisibilityCursor = null;
    let finalResultForVisibility = [];
    // creating the search string query to be used in the graphql call
    const searchQuery = "org:" + orgName + " is:" + visibilityType + " fork:true"
    do {
        var {result, pageInfo} = await getPagedRepoIdsForVisibility(graphqlClient, {searchQuery: searchQuery, cursor: repoVisibilityCursor}, visibilityType);
        // concatenating the map object after every graphql call
        finalResultForVisibility = {...finalResultForVisibility, ...result}
        repoVisibilityCursor = pageInfo.endCursor;
    } while (pageInfo.hasNextPage);

    // returning the final result map object for given visibility type
    return finalResultForVisibility;
}

module.exports = async function (context, {orgName}) {
    const graphqlClient = graphql.defaults({
        headers: {
            authorization: `token ${process.env['ghToken']}`,
        },
    });
    const visibilityTypes = [REPO_VISIBILITY_PRIVATE, REPO_VISIBILITY_PUBLIC, REPO_VISIBILITY_INTERNAL]
    let finalResult = {}
    let visibilityResult = {}
    // looping over each visibility type to fetch all related repo ids of that visibility type
    for(const visibilityType of visibilityTypes) {
        visibilityResult = await getReposForVisibility(graphqlClient, orgName, visibilityType)
         // concatenating the map object after fetching all repo ids for particular visibility
        finalResult = {...finalResult, ...visibilityResult}
    }
    // returning final map object
    context.done(null, finalResult);
};
