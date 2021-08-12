const { graphql } = require('@octokit/graphql');

module.exports = async function (context, repoIds) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${process.env['ghToken']}`
		}
	});
	return await getReposData(graphqlClient, repoIds);
};

async function getReposData(graphqlClient, repoIds) {
	const initialLanguagePageSize = 10;
	const data = await graphqlClient({
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
			repoInfo.languages.nodes = await getAllLanguagesForRepo(graphqlClient, repoInfo);
		}
	}

	return repoInfos;
}

async function getAllLanguagesForRepo(graphqlClient, repoInfo) {
	let languageCursor = null;
	let finalResult = [];

	do {
		var { languages, pageInfo } = await getPagedLanguages(graphqlClient, { repoId: repoInfo.id, cursor: languageCursor });
		finalResult = finalResult.concat(languages);
		languageCursor = pageInfo.endCursor;
	} while (pageInfo.hasNextPage);

	return finalResult;
}

async function getPagedLanguages(graphqlClient, { repoId, cursor }) {
	const languagePageSize = 100;
	const data = await graphqlClient({
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
