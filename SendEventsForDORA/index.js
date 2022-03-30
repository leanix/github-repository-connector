const GitHubClient = require('../Lib/GitHubClient');
const { getISODateStringOnFromToday } = require('../Lib/helper');
const { getLoggerInstanceFromUrlAndRunId } = require('../Lib/connectorLogger');

module.exports = async function (
	context,
	{ repositoriesIds, host, ghToken, lxToken, orgName, metadata: { connectorLoggingUrl, runId, progressCallbackUrl } }
) {
	const handler = new EventsDataHandler(context, connectorLoggingUrl, progressCallbackUrl, runId, new GitHubClient(ghToken));
	for (let repoId of repositoriesIds) {
		await handler.sendEventsForRepo(repoId, null);
	}
};

class EventsDataHandler {
	constructor(context, connectorLoggingUrl, progressCallbackUrl, runId, graphqlClient) {
		this.context = context;
		this.graphqlClient = graphqlClient;
		this.logger = getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId);
		this.graphqlClient.setLogger(this.logger, this.context, progressCallbackUrl);
	}

	async sendEventsForRepo(repoId, cursor) {
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
					baseRefName
					headRefName
					mergedAt
				  }
				}
			  }
			}
		  }
		`,
			repoIds: [repoId],
			pullReqPageCount: initialPullRequestPageCount,
			cursor: cursor
		});
	}
	async getReposCommitHistoryData(repoIds) {
		try {
			let data = await this.graphqlClient.query({
				query: `
							query getReposData($repoIds:[ID!]!, $contributorHistorySince: GitTimestamp!){
									nodes(ids: $repoIds){
											id
											... on Repository {
													defaultBranchRef {
															name
															target {
																	... on Commit {
																			id
																			history(since: $contributorHistorySince) {
																					edges {
																							node {
																								 committer {
																								 user {
																										name
																								 }
																								 email
																								 }
																							}
																					}
																			}
																	}
															}
														}    
													}
											}
									}
					`,
				repoIds,
				contributorHistorySince: getISODateStringOnFromToday()
			});
			return data.nodes;
		} catch (e) {
			this.context.log(`Failed to get repository commit history data, falling back to empty list. Error - ${e.message}`);
			return [];
		}
	}

	mapRepoInfoToCommitHistory(repoInfos, reposCommitHistory) {
		for (const repoInfo of repoInfos) {
			let history = reposCommitHistory.find((history) => history.id === repoInfo.id);
			repoInfo.defaultBranchRef = history ? history.defaultBranchRef : null;
		}

		return repoInfos;
	}

	async getReposData(repoIds, { detectMonoRepos, manifestFileName }) {
		const initialLanguagePageSize = 50;
		const data = await this.graphqlClient.query({
			query: `
            query getReposData($repoIds:[ID!]!, $languagePageCount: Int!){
                nodes(ids: $repoIds){
                    id
                    ... on Repository {
                        name
                        url
                        description
                        isArchived
                        languages(first: $languagePageCount) {
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                            edges{
                                size
                                node{
                                    id
                                    name
                                }
                            }
                        }
                        repositoryTopics(first: 10) {
                            nodes {
                                topic {
                                    id
                                    name
                                    }
                                }
                            }
                        }
                    }
                }
        `,
			repoIds,
			languagePageCount: initialLanguagePageSize
		});

		let repoInfos = data.nodes;
		for (let repoInfo of repoInfos) {
			if (repoInfo.languages.pageInfo.hasNextPage) {
				repoInfo.languages.nodes = await this.getAllLanguagesForRepo(repoInfo);
			}
		}

		const reposCommitHistoryData = await this.getReposCommitHistoryData(repoIds);
		repoInfos = this.mapRepoInfoToCommitHistory(repoInfos, reposCommitHistoryData);

		if (detectMonoRepos && manifestFileName) {
			const monoRepoWithSubReposData = {};
			for (let repoId of repoIds) {
				monoRepoWithSubReposData[repoId] = await this.searchSubRepos(repoId, manifestFileName);
			}
			repoInfos = this.mapRepoInfoToMonoRepoInfo(repoInfos, monoRepoWithSubReposData);
		} else {
			await this.logger.logInfo(
				this.context,
				'Skipping mono repo detection. reason: detectMonoRepos is false or manifestFileName is not provided'
			);
		}

		return repoInfos;
	}

	async getAllLanguagesForRepo(repoInfo) {
		let languageCursor = null;
		let finalResult = [];

		do {
			var { languages, pageInfo } = await this.getPagedLanguages({ repoId: repoInfo.id, cursor: languageCursor });
			finalResult = finalResult.concat(languages);
			languageCursor = pageInfo.endCursor;
		} while (pageInfo.hasNextPage);

		return finalResult;
	}

	async getPagedLanguages({ repoId, cursor }) {
		const languagePageSize = 100;
		const data = await this.graphqlClient.query({
			query: `
            query getLanguagesForRepo($repoId: ID!, $pageCount: Int!, $cursor: String) {
                node(id: $repoId) {
                    id
                    ... on Repository {
                        languages(first: $pageCount, after: $cursor) {
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                            edges{
                                size
                                node{
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `,
			repoId,
			cursor,
			pageCount: languagePageSize
		});
		return {
			languages: data.node.languages.nodes,
			pageInfo: data.node.languages.pageInfo
		};
	}

	async searchSubRepos(repoId, manifestFileName) {
		try {
			let data = await this.graphqlClient.query({
				query: `
					 query getReposData($repoIds: [ID!]!) {
						nodes(ids: $repoIds) {
								id
								... on Repository {
									isArchived
									name
									url
									description
									object(expression: "HEAD:") {
										 ... on Tree {
												 entries {
														 name
														 type
														 object {
																... on Tree {
																		 entries {
																				 name
																				 type
																		 }
																}
														 }
												 }
										 }
									}
								}
						}
				 }
				`,
				repoIds: [repoId]
			});
			const repoWithTree = data.nodes[0];
			const firstLevelEntries = repoWithTree.object ? repoWithTree.object.entries : [];
			if (firstLevelEntries.length === 0) {
				await this.logger.logInfo(
					this.context,
					`Monorepo detection warning: Skipping repository for sub repositories search. Reason: Empty repository. Repository Id: ${repoId}`
				);
				return [];
			}
			let secondLevel = firstLevelEntries.filter((entry) => entry.type === 'tree');

			const subRepos = [];
			for (const e of secondLevel) {
				if (!e.object || !e.object.entries) {
					await this.logger.logInfo(
						this.context,
						`Monorepo detection warning: Skipping repository for sub repositories search. Reason: Invalid repository structure. Repository Id: ${repoId}`
					);
					continue;
				}
				const subRepoMarkerFound = e.object.entries.find((entry) => entry.name === manifestFileName && entry.type === 'blob');
				if (subRepoMarkerFound) {
					subRepos.push({
						monoRepoHashId: repoId,
						monoRepoName: repoWithTree.name,
						name: e.name,
						isSubRepo: true
					});
				}
			}

			return subRepos;
		} catch (e) {
			await this.logger.logInfo(
				this.context,
				`Failed to get repository tree structure data to detect sub-repos, falling back to empty list. Repository Id: ${repoId}. Error: ${e.message}`
			);
			return [];
		}
	}

	async mapRepoInfoToMonoRepoInfo(repoInfos, monoRepoWithSubReposData) {
		for (const [repoId, subRepos] of Object.entries(monoRepoWithSubReposData)) {
			const repoInfo = repoInfos.find((repoInfo) => repoInfo.id === repoId);
			if (!repoInfo) {
				await this.logger.logError(
					this.context,
					`Should not happen: Failed to find repo info for mono repo with sub-repos. Repository hash Id: ${repoId}`
				);
				continue;
			}
			if (subRepos.length > 0) {
				repoInfo.isMonoRepo = true;
			}
		}

		const combinedRepoInfos = [...repoInfos];
		for (let subRepos of Object.values(monoRepoWithSubReposData)) {
			combinedRepoInfos.push(...subRepos);
		}

		return combinedRepoInfos;
	}
}
