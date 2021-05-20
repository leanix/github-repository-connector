/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {
    BlobServiceClient,
    generateBlobSASQueryParameters,
    SASProtocol,
    StorageSharedKeyCredential,
    BlobSASPermissions
} = require("@azure/storage-blob");

const ldifHeader = {
    "connectorId": "github-connector",
    "connectorType": "github-connector",
    "connectorVersion": "1.0.0",
    "processingDirection": "inbound",
    "processingMode": "full",
    "lxVersion": "1.0.0",
    "description": "Map organisation github repos to LeanIX Fact Sheets"
}

module.exports = async function (context, {partialResults, teamResults, repoIdsVisibilityMap, containerName, workspaceId}) {
    const contentArray = handleLdifCreation(partialResults, teamResults, repoIdsVisibilityMap)
    const blobName = await uploadToBlob(workspaceId, getFinalLdif(contentArray), containerName)
    return blobName
};

/**
 *
 * @param {Array} partialResults contains repository information
 * @param {Array} orgTeamsData contains teams information
 * @param {Object} repoIdsVisibilityMap contains repo id and it's visibility map
 */
function handleLdifCreation(partialResults, orgTeamsData, repoIdsVisibilityMap) {
    const combinedResults = partialResults.flatMap(partial => partial)
    const reposLanguagesMap = {}
    const reposTopicsMap = {}
    let contentArray = []
    for (let repoData of combinedResults) {

        for (let language of repoData.languages.edges) {
            reposLanguagesMap[language.node.id] = language.node
        }

        for (let repoTopic of repoData.repositoryTopics.nodes) {
            reposTopicsMap[repoTopic.topic.id] = repoTopic.topic
        }

        repoData.visibility = repoIdsVisibilityMap[repoData.id] ? repoIdsVisibilityMap[repoData.id] : null
        contentArray.push(convertToRepositoryContent(repoData))
    }

    for (let langNode of Object.values(reposLanguagesMap)) {
        contentArray.push(convertToLanguageContent(langNode))
    }

    for (let repoTopicNode of Object.values(reposTopicsMap)) {
        contentArray.push(convertToRepoTopicContent(repoTopicNode))
    }

    for (let teamNode of orgTeamsData) {
        contentArray.push(convertToTeamContent(teamNode))
    }

    return contentArray
}

/**
 * 
 * @param {Object} repoData 
 * @param {Object} repoVisibilityMap contains repository visibility mapping with repo id as key
 */

/* 
    convert Repo Data to object into repository content object for final LDIF
    Using the repo visibility map to find the visibility with repo id
*/

function convertToRepositoryContent(repoData) {
    return {
        type: "Repository",
        id: repoData.id,
        data: {
            name: repoData.name,
            url: repoData.url,
            description: repoData.description,
            languages: repoData.languages.edges.map(({size, node}) => {
                return {
                    langId: node.id,
                    size: (size / 1000).toFixed(2)
                }
            }),
            topics: repoData.repositoryTopics.nodes.map(({topic}) =>
                topic.id
            ),
            visibility: repoData.visibility
        }
    }
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
    }
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
    }
}

/**
 *
 * @param {Object} teamData contains team data as part of org
 */
function convertToTeamContent(teamData) {
    return {
        type: "Team",
        id: teamData.id,
        data: {
            name: teamData.name,
            parent: teamData.parentTeam ? teamData.parentTeam.id : null,
            repositories: teamData.repositories.nodes.map((node) =>
                node.id
            )
        }
    }
}

/**
 *
 * @param {Array} contentArray array containing respository info
 *
 */
function getFinalLdif(contentArray) {
    const ldifContent = {
        content: contentArray
    }
    return {...ldifHeader, ...ldifContent};
}


function getAzureCredential() {
    const account = process.env['LX_AZ_STORAGE_ACCOUNT_NAME'];
    const accountKey = process.env['LX_AZ_STORAGE_ACCOUNT_KEY'];

    if (!account || !accountKey) {
        throw new Error("Azure account details are not set");
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    const azureStorageUrlBase = `https://${account}.blob.core.windows.net`;
    return {sharedKeyCredential, azureStorageUrlBase};
}

/**
 *
 * @param {String} workspaceId LeanIX WS ID related to the organisation
 * @param {Object} finalLdif LDIF object containing repo and lang info
 * @param containerName Container name of the container sas url
 */
async function uploadToBlob(workspaceId, finalLdif, containerName) {
    const {sharedKeyCredential, azureStorageUrlBase} = getAzureCredential();
    const blobServiceClient = new BlobServiceClient(
        azureStorageUrlBase,
        sharedKeyCredential
    );
    const azContainerClient = blobServiceClient.getContainerClient(containerName);
    await azContainerClient.createIfNotExists();

    const blobName = `${workspaceId}-${Date.now()}.json`;
    const blockBlobClient = azContainerClient.getBlockBlobClient(blobName);
    const finalLdifData = JSON.stringify(finalLdif);
    await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData))

    return azureStorageUrlBase + generateSasUrlExtensionForBlob(sharedKeyCredential, containerName, blobName);
}

function generateSasUrlExtensionForBlob(sharedKeyCredential, containerName, blobName) {
    if (!containerName || !blobName) {
        throw new Error("Container name or blob name is not supplied");
    }

    const {startsOn, expiresOn} = getStartAndExpiresDates();
    const blobSASToken = generateBlobSASQueryParameters({
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"),
            startsOn: startsOn,
            expiresOn: expiresOn,
            protocol: SASProtocol.Https,
        },
        sharedKeyCredential
    ).toString();

    return `/${containerName}/${blobName}?${blobSASToken}`;
}

function getStartAndExpiresDates() {
    const now = new Date();
    const addHours = (date, h) => new Date(date.valueOf() + (h * 60 * 60 * 1000));
    return {
        startsOn: now,
        expiresOn: addHours(now, 2)
    }
}
