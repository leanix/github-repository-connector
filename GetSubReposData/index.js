const GitHubClient = require('../Lib/GitHubClient');
const { getISODateStringOnFromToday } = require('../Lib/helper');

module.exports = async function (context, { repoIds, ghToken }) {
	const handler = new SubReposDataHandler(context, new GitHubClient(ghToken));
	return await handler.getReposData(repoIds);
};

class SubReposDataHandler {
	constructor(context, graphqlClient) {
		this.context = context;
		this.graphqlClient = graphqlClient;
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

	async getReposData(repoIds) {
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
}
