/*
 * Handles LDIF storage
 */
const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');

const ldifHeader = {
	description: 'Map organisation github repos to LeanIX Fact Sheets'
};

module.exports = async function (
	context,
	{ partialResults, teamResults, repoIdsVisibilityMap, blobStorageSasUrl, metadata: { bindingKey, orgName } }
) {
	let handler = new SaveLdifToStorageHandler(context, orgName);
	const contentArray = handler.handleLdifCreation(partialResults, teamResults, repoIdsVisibilityMap);
	return await handler.uploadToBlob(handler.getFinalLdif(contentArray, bindingKey), blobStorageSasUrl);
};

class SaveLdifToStorageHandler {
	constructor(context, orgName) {
		this.context = context;
		this.orgName = orgName;
	}

	/**
	 *
	 * @param {Array} partialResults contains repository information
	 * @param {Array} orgTeamsData contains teams information
	 * @param {Object} repoIdsVisibilityMap contains repo id and it's visibility map
	 */
	handleLdifCreation(partialResults, orgTeamsData, repoIdsVisibilityMap) {
		const combinedResults = partialResults.flatMap((partial) => partial);
		const reposLanguagesMap = {};
		const reposTopicsMap = {};
		let contentArray = [];
		for (let repoData of combinedResults) {
			for (let language of repoData.languages.edges) {
				reposLanguagesMap[language.node.id] = language.node;
			}

			for (let repoTopic of repoData.repositoryTopics.nodes) {
				reposTopicsMap[repoTopic.topic.id] = repoTopic.topic;
			}

			repoData.visibility = repoIdsVisibilityMap[repoData.id] ? repoIdsVisibilityMap[repoData.id] : null;
			contentArray.push(this.convertToRepositoryContent(repoData));
		}

		for (let langNode of Object.values(reposLanguagesMap)) {
			contentArray.push(this.convertToLanguageContent(langNode));
		}

		for (let repoTopicNode of Object.values(reposTopicsMap)) {
			contentArray.push(this.convertToRepoTopicContent(repoTopicNode));
		}

		for (let teamNode of orgTeamsData) {
			contentArray.push(this.convertToTeamContent(teamNode));
		}

		return contentArray;
	}

	/**
	 *
	 * @param {Object} repoData
	 */

	/*
      convert Repo Data to object into repository content object for final LDIF
      Using the repo visibility map to find the visibility with repo id
  */

	convertToRepositoryContent(repoData) {
		return {
			type: 'Repository',
			id: this.getExternalIdForRepo(repoData),
			data: {
				name: repoData.name,
				url: repoData.url,
				gitHubRepoId: repoData.id,
				description: repoData.description,
				languages: repoData.languages.edges.map(({ size, node }) => {
					return {
						langId: node.id,
						size: (size / 1000).toFixed(2)
					};
				}),
				topics: repoData.repositoryTopics.nodes.map(({ topic }) => topic.id),
				repoVisibility: repoData.visibility,
				contributors: this.getTopContributorsFromCommitHistory()(repoData.defaultBranchRef)
			}
		};
	}

	getTopContributorsFromCommitHistory(topCount = 3) {
		return function process(defaultBranchRef) {
			if (!defaultBranchRef) {
				return [];
			}
			const isHuman = (committerNode) => (committerNode.node.committer.user ? committerNode.node.committer.user.name !== null : false);
			const history = defaultBranchRef.target.history.edges;
			const freqMap = history.filter(isHuman).reduce((committerFreqMap, committerNode) => {
				const email = committerNode.node.committer.email;
				if (!committerFreqMap[email]) {
					committerFreqMap[email] = {
						...committerNode.node,
						freq: 0
					};
				}
				committerFreqMap[email].freq += 1;
				return committerFreqMap;
			}, {});
			return Object.values(freqMap)
				.sort((a, b) => b.freq - a.freq) // high to low
				.slice(0, topCount)
				.map((committerNode) => committerNode.committer.email);
		};
	}

	/**
	 *
	 * @param {Object} langData contains language info related to repository
	 */
	convertToLanguageContent(langData) {
		return {
			type: 'Language',
			id: langData.id,
			data: {
				name: langData.name
			}
		};
	}

	/**
	 *
	 * @param {Object} topicData contains topic data related to repo
	 */
	convertToRepoTopicContent(topicData) {
		return {
			type: 'Topic',
			id: topicData.id,
			data: {
				name: topicData.name
			}
		};
	}

	/**
	 *
	 * @param {Object} teamData contains team data as part of org
	 */
	convertToTeamContent(teamData) {
		return {
			type: 'Team',
			id: teamData.id,
			data: {
				name: teamData.name,
				parent: teamData.parentTeam ? teamData.parentTeam.id : null,
				repositories: teamData.repositories.nodes.map((node) => node.id)
			}
		};
	}

	/**
	 *
	 * @param {Array} contentArray array containing respository info
	 * @param bindingKey
	 */
	getFinalLdif(contentArray, bindingKey) {
		ldifHeader.connectorType = bindingKey.connectorType;
		ldifHeader.connectorId = bindingKey.connectorId;
		ldifHeader.connectorVersion = bindingKey.connectorVersion;
		ldifHeader.processingDirection = bindingKey.processingDirection;
		ldifHeader.processingMode = bindingKey.processingMode;
		ldifHeader.lxVersion = bindingKey.lxVersion;
		ldifHeader.lxWorkspace = bindingKey.lxWorkspace;

		const ldifContent = {
			content: contentArray
		};
		return { ...ldifHeader, ...ldifContent };
	}

	/**
	 *
	 * @param {Object} finalLdif LDIF object containing repo and lang info
	 * @param {String} blobStorageSasUrl SAS Url generated and received from Integration Hub
	 */
	async uploadToBlob(finalLdif, blobStorageSasUrl) {
		const blockBlobClient = new BlobClient(blobStorageSasUrl, new AnonymousCredential()).getBlockBlobClient();
		const finalLdifData = JSON.stringify(finalLdif);
		await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData));
		this.context.log(`Successfully saved LDIF to ${blobStorageSasUrl}`);
	}

	getExternalIdForRepo(repoData) {
		const sanitise = (val) => val.toLowerCase().replace(/\s+/g, '-');
		const sanitisedRepoName = sanitise(repoData.name);
		const sanitisedOrgName = sanitise(this.orgName);
		return `${sanitisedOrgName}/${sanitisedRepoName}`;
	}
}
