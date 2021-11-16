const { graphql } = require('@octokit/graphql');

class GetOrgTeamsDataHandler {

	constructor(context) {
		this.context = context;
	}

	static hasMoreRepos(team) {
		return team.repositories.pageInfo.hasNextPage;
	}

	async getPagedRepos(graphqlClient, { teamId, cursor }) {
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

	async getAllReposForTeam(graphqlClient, team) {
		let repoCursor = null;
		let finalResult = [];

		do {
			var { repos, pageInfo } = await this.getPagedRepos(graphqlClient, { teamId: team.id, cursor: repoCursor });
			finalResult = finalResult.concat(repos);
			repoCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return finalResult;
	}

	async getPagedTeamsData(graphqlClient, { orgName, pageCount, cursor }) {
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
			if (GetOrgTeamsDataHandler.hasMoreRepos(team)) {
				team.repositories.nodes = await this.getAllReposForTeam(graphqlClient, team);
			}
		}

		return {
			teams,
			pageInfo: data.organization.teams.pageInfo
		};
	}

	async getAllTeamsWithRepos(graphqlClient, orgName, repositoriesIds) {
		let teamCursor = null;
		let finalResult = [];
		const teamPageSize = 25;

		do {
			var { teams, pageInfo } = await this.getPagedTeamsData(graphqlClient, { orgName, pageCount: teamPageSize, cursor: teamCursor });
			finalResult = finalResult.concat(teams);
			teamCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		for (const team of finalResult) {
			team.repositories.nodes = this.filterNonOrgReposFromTeam(repositoriesIds)(team.repositories.nodes)
		}

		return finalResult;
	}

	filterNonOrgReposFromTeam(orgRepositoriesIds) {
		function containsInOrgRepos(repoId) {
			return orgRepositoriesIds.find(id => id === repoId);
		}

		return function(teamRepositories) {
			return teamRepositories.filter(repo => containsInOrgRepos(repo.id));
		}
	}

}

module.exports = async function (context, { orgName, ghToken, orgRepositoriesIds }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});

	let handler = new GetOrgTeamsDataHandler(context);
	const finalResult = await handler.getAllTeamsWithRepos(graphqlClient, orgName, orgRepositoriesIds);
	context.done(null, finalResult);
};
