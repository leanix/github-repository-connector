﻿/*
 * Handles LDIF storage
 */
const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');

const ldifHeader = {
	description: 'Map organisation github repos to LeanIX Fact Sheets'
};

module.exports = async function (context, { partialResults, teamResults, repoIdsVisibilityMap, blobStorageSasUrl, bindingKey }) {
	const contentArray = handleLdifCreation(partialResults, teamResults, repoIdsVisibilityMap);
	return await uploadToBlob(getFinalLdif(contentArray, bindingKey), blobStorageSasUrl);
};

/**
 *
 * @param {Array} partialResults contains repository information
 * @param {Array} orgTeamsData contains teams information
 * @param {Object} repoIdsVisibilityMap contains repo id and it's visibility map
 */
function handleLdifCreation(partialResults, orgTeamsData, repoIdsVisibilityMap) {
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
		contentArray.push(convertToRepositoryContent(repoData));
	}

	for (let langNode of Object.values(reposLanguagesMap)) {
		contentArray.push(convertToLanguageContent(langNode));
	}

	for (let repoTopicNode of Object.values(reposTopicsMap)) {
		contentArray.push(convertToRepoTopicContent(repoTopicNode));
	}

	for (let teamNode of orgTeamsData) {
		contentArray.push(convertToTeamContent(teamNode));
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

function convertToRepositoryContent(repoData) {
	return {
		type: 'Repository',
		id: repoData.id,
		data: {
			name: repoData.name,
			url: repoData.url,
			description: repoData.description,
			languages: repoData.languages.edges.map(({ size, node }) => {
				return {
					langId: node.id,
					size: (size / 1000).toFixed(2)
				};
			}),
			topics: repoData.repositoryTopics.nodes.map(({ topic }) => topic.id),
			repoVisibility: repoData.visibility
		}
	};
}

/**
 *
 * @param {Object} langData contains language info related to repository
 */
function convertToLanguageContent(langData) {
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
function convertToRepoTopicContent(topicData) {
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
function convertToTeamContent(teamData) {
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
 *
 */
function getFinalLdif(contentArray, bindingKey) {
	ldifHeader.connectorType = bindingKey.connectorType;
	ldifHeader.connectorId = bindingKey.connectorId;
	ldifHeader.connectorVersion = bindingKey.connectorVersion;
	ldifHeader.processingDirection = bindingKey.processingDirection;
	ldifHeader.processingMode = bindingKey.processingMode;
	ldifHeader.lxVersion = bindingKey.lxVersion;
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
async function uploadToBlob(finalLdif, blobStorageSasUrl) {
	const blockBlobClient = new BlobClient(blobStorageSasUrl, new AnonymousCredential()).getBlockBlobClient();
	const finalLdifData = JSON.stringify(finalLdif);
	await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData));
}
