const GitHubClient = require('../Lib/GitHubClient');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');
const Util = require('../Lib/helper');

class GetOrgTeamsDataHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient = graphqlClient;
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
	}

	static hasMoreRepos(team) {
		return team.repositories.pageInfo.hasNextPage;
	}

	async getPagedTeamsData({ orgName, pageCount, cursor }) {
		const initialRepoPageSize = 100;
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
				team.hasMoreReposInitialSet = true;
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
			await this.logger.logInfo(
				this.context,
				`Fetching batch organisation teams data. Team fetch status : ${finalResult.length}/${totalTeamsCount}`
			);
			teamCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		for (const team of finalResult) {
			team.repositories.nodes = Util.filterNonOrgReposFromTeam(repositoriesIds)(team.repositories.nodes);
		}

		return finalResult;
	}
}

module.exports = async function (
	context,
	{ orgName, ghToken, orgRepositoriesIds, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	let handler = new GetOrgTeamsDataHandler(context, connectorLoggingUrl, progressCallbackUrl, runId, new GitHubClient(ghToken));
	return await handler.getAllTeamsWithRepos(orgName, orgRepositoriesIds);
};
