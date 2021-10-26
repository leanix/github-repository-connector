const { graphql } = require('@octokit/graphql');
const { ConnectorLogger, LogStatus } = require('../GithubRepoScanOrchestrator/connectorLogger');
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
                    }
                    repositories(first: $reposPageCount) {
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

module.exports = async function (context, { orgName, ghToken, connectorLoggingUrl, runId }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});
	const logger = new ConnectorLogger(connectorLoggingUrl, context, runId);
	await logger.log(LogStatus.INFO, 'Completed fetching complete repo data for repo ids');
	await logger.log(LogStatus.INFO, 'Started fetching org teams data');
	const finalResult = await getAllTeamsWithRepos(graphqlClient, orgName);
	await logger.log(LogStatus.INFO, 'Completed fetching org teams data');
	context.done(null, finalResult);
};
