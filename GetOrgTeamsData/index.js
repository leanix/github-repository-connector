﻿const { graphql } = require('@octokit/graphql');

function hasMoreRepos(team) {
	return team.repositories.pageInfo.hasNextPage;
}

async function getPagedRepos(graphqlClient, { teamId, cursor }) {
	const reposPageSize = 100;
	const data = await graphqlClient({
		query: `
            query getReposForTeam($teamId: ID!, $pageCount: Int!, $cursor: String) {
              node(id: $teamId) {
                id
                ... on Team {
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
            }
        `,
		teamId,
		cursor,
		pageCount: reposPageSize
	});

	return {
		repos: data.node.repositories.nodes,
		pageInfo: data.node.repositories.pageInfo
	};
}

async function getAllReposForTeam(graphqlClient, team) {
	let repoCursor = null;
	let finalResult = [];

	do {
		var { repos, pageInfo } = await getPagedRepos(graphqlClient, { teamId: team.id, cursor: repoCursor });
		finalResult = finalResult.concat(repos);
		repoCursor = pageInfo.endCursor;
	} while (pageInfo.hasNextPage);

	return finalResult;
}

async function getPagedTeamsData(graphqlClient, { orgName, pageCount, cursor }) {
	const initialRepoPageSize = 50;
	const data = await graphqlClient({
		query: `
            query getOrgTeams($queryString: String!, $pageCount: Int!, $cursor: String, $reposPageCount: Int!) {
              organization(login: $queryString) {
                teams(first: $pageCount, after: $cursor) {
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                  nodes {
                    id
                    name
                    parentTeam {
                      id
                      name
                    }
                    repositories(first: $reposPageCount) {
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
              }
        }

        `,
		queryString: orgName,
		pageCount,
		cursor,
		reposPageCount: initialRepoPageSize
	});
	let teams = data.organization.teams.nodes;

	for (let team of teams) {
		if (hasMoreRepos(team)) {
			team.repositories.nodes = await getAllReposForTeam(graphqlClient, team);
		}
	}

	return {
		teams,
		pageInfo: data.organization.teams.pageInfo
	};
}

async function getAllTeamsWithRepos(graphqlClient, orgName) {
	let teamCursor = null;
	let finalResult = [];
	const teamPageSize = 25;

	do {
		var { teams, pageInfo } = await getPagedTeamsData(graphqlClient, { orgName, pageCount: teamPageSize, cursor: teamCursor });
		finalResult = finalResult.concat(teams);
		teamCursor = pageInfo.endCursor;
	} while (pageInfo.hasNextPage);
	return finalResult;
}

module.exports = async function (context, { orgName, ghToken }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});

	const finalResult = await getAllTeamsWithRepos(graphqlClient, orgName);
	context.done(null, finalResult);
};
