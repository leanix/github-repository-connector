const GitHubClient = require('../Lib/GitHubClient');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');

class GetOrgTeamsDataHandler {
	constructor(context, connectorLoggingUrl, runId, graphqlClient) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient = graphqlClient;
		this.graphqlClient.setLogger(this.logger);
	}

	static hasMoreRepos(team) {
		return team.repositories.pageInfo.hasNextPage;
	}

	async getPagedRepos({ teamId, cursor }) {
		const reposPageSize = 100;
		const data = await this.graphqlClient.query({
			query: `
            query getReposForTeam($teamId: ID!, $pageCount: Int!, $cursor: String) {
              node(id: $teamId) {
                id
                ... on Team {
                  repositories(first: $pageCount, after: $cursor) {
                    totalCount
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
			pageInfo: data.node.repositories.pageInfo,
			totalTeamReposCount: data.node.repositories.totalCount
		};
	}

	async getAllReposForTeam(team) {
		let repoCursor = null;
		let finalResult = [];

		do {
			var { repos, pageInfo, totalTeamReposCount } = await this.getPagedRepos({ teamId: team.id, cursor: repoCursor });
			finalResult = finalResult.concat(repos);
			await this.logger.logInfo(this.context, `Fetching batch organisation team's repositories data. Team ID: ${team.id}, Fetch status: ${finalResult.length}/${totalTeamReposCount}`);
			repoCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return finalResult;
	}

	async getPagedTeamsData({ orgName, pageCount, cursor }) {
		const initialRepoPageSize = 50;
		const data = await this.graphqlClient.query({
			query: `
            query getOrgTeams($queryString: String!, $pageCount: Int!, $cursor: String, $reposPageCount: Int!) {
              organization(login: $queryString) {
                teams(first: $pageCount, after: $cursor) {
                  totalCount
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
			if (GetOrgTeamsDataHandler.hasMoreRepos(team)) {
				team.repositories.nodes = await this.getAllReposForTeam(team);
			}
		}

		return {
			teams,
			pageInfo: data.organization.teams.pageInfo,
			totalTeamsCount: data.organization.teams.totalCount
		};
	}

	async getAllTeamsWithRepos(orgName, repositoriesIds) {
		let teamCursor = null;
		let finalResult = [];
		const teamPageSize = 25;

		do {
			var { teams, pageInfo, totalTeamsCount } = await this.getPagedTeamsData({ orgName, pageCount: teamPageSize, cursor: teamCursor });
			finalResult = finalResult.concat(teams);
			await this.logger.logInfo(this.context, `Fetching batch organisation teams data. Team fetch status : ${finalResult.length}/${totalTeamsCount}`);
			teamCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		for (const team of finalResult) {
			team.repositories.nodes = this.filterNonOrgReposFromTeam(repositoriesIds)(team.repositories.nodes);
		}

		await this.logger.logInfo(this.context, `Fetched org teams. Result : ${finalResult.length} teams`);

		return finalResult;
	}

	filterNonOrgReposFromTeam(orgRepositoriesIds) {
		function containsInOrgRepos(repoId) {
			return orgRepositoriesIds.find((id) => id === repoId);
		}

		return function (teamRepositories) {
			return teamRepositories.filter((repo) => containsInOrgRepos(repo.id));
		};
	}
}

module.exports = async function (context, { orgName, ghToken, orgRepositoriesIds, metadata: { connectorLoggingUrl, runId } }) {
	let handler = new GetOrgTeamsDataHandler(context, connectorLoggingUrl, runId, new GitHubClient(ghToken));
	return await handler.getAllTeamsWithRepos(orgName, orgRepositoriesIds);
};
