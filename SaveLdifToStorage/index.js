/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {ContainerClient} = require("@azure/storage-blob");

const ldifHeader = {
    "connectorId": "github-connector",
    "connectorType": "github-connector",
    "connectorVersion": "1.0.0",
    "processingDirection": "inbound",
    "processingMode": "full",
    "lxVersion": "1.0.0",
    "description": "Map organisation github repos to LeanIX Fact Sheets"
}

module.exports = async function (context, {partialResults, GetOrgTeamsData, containerSasUrl, workspaceId}) {
    const contentArray = handleLdifCreation(partialResults, GetOrgTeamsData)
    const blobName = await uploadToBlob(containerSasUrl, workspaceId, getFinalLdif(contentArray))
    return blobName
};

/**
 * 
 * @param {Array} partialResults contains repository information
 * @param {Array} orgTeamsData contains teams information
 */
function handleLdifCreation (partialResults, orgTeamsData) {
    const combinedResults = partialResults.flatMap(partial => partial)
    const reposLanguagesMap = {}
    const reposTopicsMap = {}
    let contentArray = []
    for(let repoData of combinedResults) {

        //maintaining a map of all languages used in the repositories
        //we later use this map to create language content items
        if (repoData.languages) {
            for(let language of repoData.languages.nodes) {
                if (!(language.id in reposLanguagesMap)) {
                    reposLanguagesMap[language.id] = language
                }
            }
        }

        //maintaining a map of all repository topics used in the repositories
        //we later use this map to create topic content items
        if (repoData.repositoryTopics) {
            for(let repoTopic of repoData.repositoryTopics.nodes) {
                if (!(repoTopic.topic.id in reposTopicsMap)) {
                    reposTopicsMap[repoTopic.topic.id] = repoTopic.topic
                }
            }
        }

        //pushing repository content object into the content array
        contentArray.push(convertToRepositoryContent(repoData))
    }
    
    //pushing language content objects into the content array
    for(let langNode of Object.keys(reposLanguagesMap)) {
        contentArray.push(convertToLanguageContent(reposLanguagesMap[langNode]))
    }

    //pushing repo topic content objects into the content array
    for(let repoTopicNode of Object.keys(reposTopicsMap)) {
        contentArray.push(convertToRepoTopicContent(reposTopicsMap[repoTopicNode]))
    }

    //pushing teams content objects into the content array
    if (orgTeamsData && orgTeamsData.length) {
        for(let teamNode of orgTeamsData.teams.nodes) {
            contentArray.push(convertToTeamContent(teamNode))
        }
    }
    return contentArray
}

/**
 * 
 * @param {Object} repoData contains repository info from github
 */

/* convert Repo Data to object into repository content object for final LDIF */
function convertToRepositoryContent (repoData) {
    let tempArr = repoData.repositoryTopics && repoData.repositoryTopics.nodes.map((node)=> 
        node.topic.id
    )
    return {
        type: "Repository",
        id: repoData.id,
        data: {
            name: repoData.name,
            url: repoData.url,
            languages: repoData.languages && repoData.languages.nodes.map((node)=>
                node.id
            ),
            topics: repoData.repositoryTopics && repoData.repositoryTopics.nodes.map(({topic})=> 
                topic.id
            )
        }
    }
}

/**
 * 
 * @param {Object} langData contains language info related to repository
 */
function convertToLanguageContent (langData) {
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
function convertToRepoTopicContent (topicData) {
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
function convertToTeamContent (teamData) {
    return {
        type: "Repository",
        id: teamData.id,
        data: {
            name: teamData.name,
            repositories: teamData.repositories && teamData.repositories.nodes.map((node)=>
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
function getFinalLdif (contentArray) {
    const ldifContent = {
        content: contentArray
    }
    const finalLdif = {...ldifHeader, ...ldifContent}
    return finalLdif
}


/**
 * 
 * @param {String} containerSasUrl SAS url for the container 
 * @param {String} workspaceId LeanIX WS ID related to the organisation
 * @param {Object} finalLdif LDIF object containing repo and lang info
 * 
 */
async function uploadToBlob (containerSasUrl, workspaceId, finalLdif) {
    const containerClient = new ContainerClient(containerSasUrl);

    const blobName = `${workspaceId}-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const finalLdifData = JSON.stringify(finalLdif);

    try {
        /* Uploading the final stringified json object as a block blob */
        await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData))
    } catch (e) {
        return '__UPLOAD_FAILED';
    }
    return blobName;
}