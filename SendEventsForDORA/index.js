const GitHubClient = require('../Lib/GitHubClient');
const { getISODateStringOnFromToday, getAccessToken } = require('../Lib/helper');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');
const axios = require('axios');

module.exports = async function (
	context,
	{ repositoriesIds, host, ghToken, lxToken, orgName, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	const handler = new EventsDataHandler(context, connectorLoggingUrl, progressCallbackUrl, runId, new GitHubClient(ghToken));
	for (let repoId of repositoriesIds) {
		await handler.sendEventsForRepo(repoId, host, lxToken, orgName);
	}
};

class EventsDataHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient) {
		this.context = context;
		this.graphqlClient = graphqlClient;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
	}

	async sendEventsForRepo(repoId, host, lxToken, orgName) {
		let baseUrl = `https://${host}/services/valuestreams/v1/api`;
		let bearerToken = await getAccessToken(host, lxToken);
		let initialPullRequestPageCount = 100;
		const data = await this.graphqlClient.query({
			query: `
		query getReposPullRequestsData($repoIds: [ID!]!, $pullReqPageCount: Int!, $cursor: String) {
			nodes(ids: $repoIds) {
			  id
			  ... on Repository {
				name
				description
				defaultBranchRef {
				  name
				}
				pullRequests(first: $pullReqPageCount, states: [MERGED], after: $cursor,  orderBy: {direction: DESC, field: UPDATED_AT}) {
				  totalCount
				  pageInfo {
					endCursor
					hasNextPage
				  }
				  nodes {
					id
					baseRefName
					headRefName
					mergedAt
					headRefOid
				  }
				}
			  }
			}
		  }
		`,
			repoIds: [repoId],
			pullReqPageCount: initialPullRequestPageCount,
			cursor: null
		});
		let repoPullRequestInfo = data.nodes;
		let last30day = new Date(getISODateStringOnFromToday(90));
		if (repoPullRequestInfo[0].pullRequests.nodes && repoPullRequestInfo[0].pullRequests.nodes.length > 0) {
			let lastPRInListMergeDate = new Date(
				repoPullRequestInfo[0].pullRequests.nodes[repoPullRequestInfo[0].pullRequests.nodes.length - 1].mergedAt
			);
			if (lastPRInListMergeDate >= last30day && repoPullRequestInfo[0].pullRequests.pageInfo.hasNextPage) {
				repoPullRequestInfo[0].pullRequests.nodes = await this.getAllPRsForRepo(repoPullRequestInfo[0]);
			}
		}

		// filter only those pullReqs which are less than 30 days
		let pullRequestsBelow30Days = repoPullRequestInfo[0].pullRequests.nodes.filter((pullReq) => new Date(pullReq.mergedAt) >= last30day && repoPullRequestInfo[0].defaultBranchRef.name == pullReq.baseRefName);
		if(pullRequestsBelow30Days.length > 0) {
			await this.logger.logInfo(this.context, `Started sending events for repo : ${repoPullRequestInfo[0].name}`)
		} else {
			await this.logger.logInfo(this.context, `NO valid events for repo: ${repoPullRequestInfo[0].name}`)
		}
		for (let pullReq of pullRequestsBelow30Days) {
			let commits = await this.getAllCommitsForPullRequest(pullReq.id);
			let changeIds = [];
			for (let commit of commits) {
				await this.registerChangeEventInVSM(
					baseUrl,
					bearerToken,
					commit.oid,
					`${orgName}/${repoPullRequestInfo[0].name}`,
					commit.committedDate,
					commit.author.email
				);
				changeIds.push(commit.oid);
			}
			await this.registerReleaseEventInVSM(
				baseUrl,
				bearerToken,
				pullReq.headRefOid,
				`${orgName}/${repoPullRequestInfo[0].name}`,
				pullReq.mergedAt,
				changeIds
			);
			await this.logger.logInfo(this.context, `Completed sending events for repo : ${repoPullRequestInfo[0].name}`)
		}
	}

	async getAllPRsForRepo(repoInfo) {
		let prCursor = null;
		let finalResult = [];
		let last30day = new Date(getISODateStringOnFromToday(90));
		do {
			var { pullRequests, pageInfo } = await this.getPagedPullRequests({ repoId: repoInfo.id, cursor: prCursor });
			finalResult = finalResult.concat(pullRequests);
			let lastPRInListMergeDate = new Date(pullRequests[pullRequests.length - 1].mergedAt);
			if (lastPRInListMergeDate >= last30day) {
				return finalResult;
			}
			prCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return finalResult;
	}

	async getPagedPullRequests({ repoId, cursor }) {
		const pullReqPageSize = 100;
		const data = await this.graphqlClient.query({
			query: `
		query getReposPullRequestsData($repoIds: [ID!]!, $pullReqPageCount: Int!, $cursor: String) {
			nodes(ids: $repoIds) {
			  id
			  ... on Repository {
				name
				pullRequests(first: $pullReqPageCount, states: [MERGED], after: $cursor,  orderBy: {direction: DESC, field: UPDATED_AT}) {
				  totalCount
				  pageInfo {
					endCursor
					hasNextPage
				  }
				  nodes {
					id
					baseRefName
					headRefName
					mergedAt
					headRefOid
				  }
				}
			  }
			}
		  }
		`,
			repoIds: [repoId],
			pullReqPageCount: pullReqPageSize,
			cursor: cursor
		});
		return {
			pullRequests: data.nodes[0].pullRequests.nodes,
			pageInfo: data.nodes[0].pullRequests.pageInfo
		};
	}

	async getAllCommitsForPullRequest(pullReqId) {
		let commitCursor = null;
		let finalResult = [];
		do {
			var { commits, pageInfo } = await this.getPagedCommitsForPullRequest(pullReqId, commitCursor);
			finalResult = finalResult.concat(commits);
			commitCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return finalResult;
	}

	async getPagedCommitsForPullRequest(pullReqId, cursor) {
		let initialCommitPageCount = 100;
		const data = await this.graphqlClient.query({
			query: `query getPullRequestCommits($pullReqIds: [ID!]!, $initialCommitPageCount: Int!, $cursor: String) {
				nodes(ids: $pullReqIds) {
				  id
				  ... on PullRequest {
					headRefName
					commits(first:$initialCommitPageCount, after: $cursor) {
					  totalCount
					  pageInfo{
						hasNextPage
						endCursor
					  }
					  nodes {
						commit {
						  changedFiles
						  committedDate
						  oid
						  id
						  author {
							name
							email
						  }
						}
					  }
					}
				  }
				}
			  }`,
			pullReqIds: pullReqId,
			initialCommitPageCount: initialCommitPageCount,
			cursor: cursor
		});
		return {
			commits: data.nodes[0].commits.nodes.map((node) => node.commit),
			pageInfo: data.nodes[0].commits.pageInfo
		};
	}

	async registerChangeEventInVSM(baseUrl, bearerToken, ceId, ceSource, ceTime, author) {
		let changeEventClient = axios.create({
			baseURL: baseUrl,
			headers: {
				'Ce-Specversion': '1.0',
				'Ce-Type': 'net.leanix.valuestreams.change',
				'Ce-Id': ceId,
				'Ce-Source': ceSource,
				'Ce-Time': ceTime,
				'Ce-Datacontenttype': 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${bearerToken}`
			}
		});
		try {
			await changeEventClient.post('/events', {
				"author": author
			});
		} catch (e) {
			this.logger.logError(this.context, `Error while registerig change event: ${e.message}`);
		}
	}

	async registerReleaseEventInVSM(baseUrl, bearerToken, ceId, ceSource, ceTime, changeIds) {
		let releaseEventClient = axios.create({
			baseURL: baseUrl,
			headers: {
				'Ce-Specversion': '1.0',
				'Ce-Type': 'net.leanix.valuestreams.release',
				'Ce-Id': ceId,
				'Ce-Source': ceSource,
				'Ce-Time': ceTime,
				'Ce-Datacontenttype': 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${bearerToken}`
			}
		});
		try {
			await releaseEventClient.post('/events', {
				"changeIds": changeIds
			});
		} catch (e) {
			this.logger.logError(this.context, `Error while registerig release event: ${e.message}`);
		}
	}
}
