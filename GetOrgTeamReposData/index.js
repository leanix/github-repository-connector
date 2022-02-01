const GitHubClient = require('../Lib/GitHubClient');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');
const Util = require('../Lib/helper');

class GetOrgTeamReposDataHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, orgName, team, graphqlClient) {
		this.context = context;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.orgName = orgName;
		this.team = team;
		this.graphqlClient = graphqlClient;
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
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

	async getAllReposForTeam(orgRepositoriesIds) {
		let repoCursor = null;
		let finalResult = [];

		do {
			var { repos, pageInfo, totalTeamReposCount } = await this.getPagedRepos({ teamId: this.team.id, cursor: repoCursor });
			finalResult = finalResult.concat(repos);
			await this.logger.logInfo(
				this.context,
				`Fetching batch-wise organisation team's repositories data. Team ID: ${this.team.id}, Fetch status: ${finalResult.length}/${totalTeamReposCount}`
			);
			repoCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return Util.filterNonOrgReposFromTeam(orgRepositoriesIds)(finalResult);
	}
}

module.exports = async function (
	context,
	{ orgName, ghToken, orgRepositoriesIds, team, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	let handler = new GetOrgTeamReposDataHandler(
		context,
		connectorLoggingUrl,
		progressCallbackUrl,
		runId,
		orgName,
		team,
		new GitHubClient(ghToken)
	);
	team.repositories.nodes = await handler.getAllReposForTeam(orgRepositoriesIds);
	return team;
};
