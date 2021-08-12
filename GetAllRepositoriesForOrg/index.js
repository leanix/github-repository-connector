const { graphql } = require("@octokit/graphql");
const { checkRegexExcludeList } = require("./helper");

function excludeListedRepositoriesIDsList(
  repositoriesData,
  regexExcludeListArray
) {
  let remainingRepoIdsArray = repositoriesData
    .filter((repoData) => {
      let noMatch = true;
      regexExcludeListArray.forEach((regex) => {
        if (repoData.name.match(regex)) {
          noMatch = false;
        }
      });
      return noMatch;
    })
    .map((repoData) => repoData.id);
  return remainingRepoIdsArray;
}

async function getRepositoriesIds(
  graphqlClient,
  { orgName, pageCount, cursor },
  regexExcludeListArray
) {
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
    cursor,
  });

  const idList = excludeListedRepositoriesIDsList(
    data.organization.repositories.nodes,
    regexExcludeListArray
  );

  return {
    ids: idList,
    pageInfo: data.organization.repositories.pageInfo,
  };
}

async function getAllRepositoryIds(
  graphqlClient,
  orgName,
  regexExcludeListArray
) {
  let cursor = null;
  let finalResult = [];

  do {
    var { ids, pageInfo } = await getRepositoriesIds(
      graphqlClient,
      {
        orgName,
        pageCount: 100,
        cursor,
      },
      regexExcludeListArray
    );
    finalResult = finalResult.concat(ids);
    cursor = pageInfo.endCursor;
  } while (pageInfo.hasNextPage);
  return finalResult;
}

module.exports = async function (context, { orgName, repoNamesExcludeList }) {
  let regexExcludeListArray = checkRegexExcludeList(repoNamesExcludeList);

  const graphqlClient = graphql.defaults({
    headers: {
      authorization: `token ${process.env["ghToken"]}`,
    },
  });

  const finalResult = await getAllRepositoryIds(
    graphqlClient,
    orgName,
    regexExcludeListArray
  );
  context.done(null, finalResult);
};
