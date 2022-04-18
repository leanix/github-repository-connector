const GitHubClient = require('../Lib/GitHubClient');
const HttpClient = require('../Lib/HttpClient');
const { getISODateStringOnFromToday, getAccessToken, getEventsServiceBaseUrl } = require('../Lib/helper');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');

module.exports = async function (
	context,
	{ repositoriesIds, host, ghToken, lxToken, orgName, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	const handler = new EventsDataHandler(
		context,
		connectorLoggingUrl,
		progressCallbackUrl,
		runId,
		new GitHubClient(ghToken),
		host,
		new HttpClient()
	);
	let result = [];
	for (let repoId of repositoriesIds) {
		let eventsSent = await handler.sendEventsForRepo(repoId, host, lxToken, orgName);
		result.push(eventsSent);
	}
	return result;
};

class EventsDataHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient, host, httpClient) {
		this.context = context;
		this.graphqlClient = graphqlClient;
		this.httpClient = httpClient;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
		this.httpClient.setLogger(this.logger, this.context, progressCallbackUrl);
		this.baseUrl = getEventsServiceBaseUrl(host);
	}

	async sendEventsForRepo(repoId, host, lxToken, orgName) {
		let bearerToken = await getAccessToken(host, lxToken);
		let initialPullRequestPageCount = 100;
		let eventsCount = 0;
		const data = await this.graphqlClient.query({
			query: `
		query getReposPullRequestsData($repoIds: [ID!]!, $pullReqPageCount: Int!, $cursor: String) {
			nodes(ids: $repoIds) {
			  id
			  ... on Repository {
				name
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
		let last30day = new Date(getISODateStringOnFromToday(30));
		if (repoPullRequestInfo[0].pullRequests.nodes && repoPullRequestInfo[0].pullRequests.nodes.length > 0) {
			let lastPRInListMergeDate = new Date(
				repoPullRequestInfo[0].pullRequests.nodes[repoPullRequestInfo[0].pullRequests.nodes.length - 1].mergedAt
			);
			if (lastPRInListMergeDate >= last30day && repoPullRequestInfo[0].pullRequests.pageInfo.hasNextPage) {
				repoPullRequestInfo[0].pullRequests.nodes = await this.getAllPRsForRepo(repoPullRequestInfo[0]);
			}
		}

		// filter only those pullReqs which are less than 30 days
		let pullRequestsBelow30Days = repoPullRequestInfo[0].pullRequests.nodes.filter(
			(pullReq) => new Date(pullReq.mergedAt) >= last30day && repoPullRequestInfo[0].defaultBranchRef.name == pullReq.baseRefName
		);
		if (pullRequestsBelow30Days.length > 0) {
			await this.logger.logInfo(this.context, `Started sending events for repo : ${repoPullRequestInfo[0].name}`);
		} else {
			await this.logger.logInfo(this.context, `NO valid events for repo: ${repoPullRequestInfo[0].name}`);
			return {
				repoName: repoPullRequestInfo[0].name,
				eventsCount: eventsCount
			};
		}
		for (let pullReq of pullRequestsBelow30Days) {
			let commits = await this.getAllCommitsForPullRequest(pullReq.id);
			let changeIds = [];
			for (let commit of commits) {
				await this.registerChangeEventInVSM(
					bearerToken,
					commit.oid,
					`${orgName}/${repoPullRequestInfo[0].name}`,
					commit.committedDate,
					commit.author.email
				);
				changeIds.push(commit.oid);
				eventsCount += 1;
			}
			await this.registerReleaseEventInVSM(
				bearerToken,
				pullReq.headRefOid,
				`${orgName}/${repoPullRequestInfo[0].name}`,
				pullReq.mergedAt,
				changeIds
			);
			eventsCount += 1;
		}
		await this.logger.logInfo(
			this.context,
			`Completed sending events for repo : ${repoPullRequestInfo[0].name} events sent is ${eventsCount}`
		);
		return {
			repoName: repoPullRequestInfo[0].name,
			eventsCount: eventsCount
		};
	}

	async getAllPRsForRepo(repoInfo) {
		let prCursor = null;
		let finalResult = [];
		let last30day = new Date(getISODateStringOnFromToday(30));
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

	async registerChangeEventInVSM(bearerToken, ceId, ceSource, ceTime, author) {
		let headers = {
			'Ce-Specversion': '1.0',
			'Ce-Type': 'net.leanix.valuestreams.change',
			'Ce-Id': ceId,
			'Ce-Source': ceSource,
			'Ce-Time': ceTime,
			'Ce-Datacontenttype': 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${bearerToken}`
		};
		try {
			await this.httpClient.queryPostFn()(`${this.baseUrl}/events`, headers, { author: author });
		} catch (e) {
			await this.logger.logError(
				this.context,
				`Failed to register change event, for the repo : ${ceSource} with commit SHA: ${ceId} commited at: ${ceTime}. Will ignore for now and continue to register other events. Error: ${e.message}`
			);
		}
	}

	async registerReleaseEventInVSM(bearerToken, ceId, ceSource, ceTime, changeIds) {
		let headers = {
			'Ce-Specversion': '1.0',
			'Ce-Type': 'net.leanix.valuestreams.release',
			'Ce-Id': ceId,
			'Ce-Source': ceSource,
			'Ce-Time': ceTime,
			'Ce-Datacontenttype': 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${bearerToken}`
		};
		try {
			await this.httpClient.queryPostFn()(`${this.baseUrl}/events`, headers, { changeIds: changeIds });
		} catch (e) {
			await this.logger.logError(
				this.context,
				`Failed to register release event, for the repo : ${ceSource} with PR headRefOid: ${ceId} merged at: ${ceTime}. Will ignore for now and continue to register other events. Error: ${e.message}`
			);
		}
	}
}
