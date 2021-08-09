const { graphql } = require("@octokit/graphql");
const { checkRegexBlacklist } = require("./helper");

function excludeBlacklistedRepositoriesIDsList(
  repositoriesData,
  regexBlacklistArray
) {
  let remainingRepoIdsArray = repositoriesData
    .filter((repoData) => {
      let noMatch = true;
      regexBlacklistArray.forEach((regex) => {
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
  regexBlacklistArray
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

  const idList = excludeBlacklistedRepositoriesIDsList(
    data.organization.repositories.nodes,
    regexBlacklistArray
  );

  return {
    ids: idList,
    pageInfo: data.organization.repositories.pageInfo,
  };
}

async function getAllRepositoryIds(
  graphqlClient,
  orgName,
  regexBlacklistArray
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
      regexBlacklistArray
    );
    finalResult = finalResult.concat(ids);
    cursor = pageInfo.endCursor;
  } while (pageInfo.hasNextPage);
  return finalResult;
}

module.exports = async function (context, { orgName, repoNamesBlacklist }) {
  let regexBlacklistArray = checkRegexBlacklist(repoNamesBlacklist);

  const graphqlClient = graphql.defaults({
    headers: {
      authorization: `token ${process.env["ghToken"]}`,
    },
  });

  const finalResult = await getAllRepositoryIds(
    graphqlClient,
    orgName,
    regexBlacklistArray
  );
  context.done(null, finalResult);
};
