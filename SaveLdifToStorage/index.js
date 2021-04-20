/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {ContainerClient} = require("@azure/storage-blob");

module.exports = async function (context, {partialResults, containerSasUrl, workspaceId}) {
    const combinedResults = partialResults.flatMap(partial => partial);
    let existingLanguagesIds = []
    let existingLabelsIds = []
    // const data1 = getReposData(repoIds).map(convertToLdif(existingLanguagesIds, existingLabelsIds));
    let data = []
    let partialData = []
    let existingLanguagesIds2 = []
    let existingLabelsIds2 = []
    // const reposData = getReposData(repoIds)
    combinedResults.map(repoData => {
        [partialData, existingLanguagesIds2, existingLabelsIds2] = convertToLdif(repoData, existingLanguagesIds, existingLabelsIds)
        existingLanguagesIds = existingLanguagesIds2
        existingLabelsIds = existingLabelsIds2
        data = [data, ...partialData]
    })
    // save to required azure storage

    // send sas url
    // return `sas-url`;



    context.log('stats: partial results#', partialResults.length, 'complete partial results#',
        partialResults.map(x => x.length).reduce((sum, c) => sum + c, 0), 'combined results#', combinedResults.length)

    const containerClient = new ContainerClient(containerSasUrl);

    const blobName = `${workspaceId}-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const finalLdifData = JSON.stringify(combinedResults);

    try {
        await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData))
    } catch (e) {
        return '__UPLOAD_FAILED';
    }
    return blobName;
};

function convertToLdif(repoData, existingLanguagesIds, existingLabelsIds) {
    const ldif = {
        type: "Repository",
        id: repoData.id,
        data: {
            name: repoData.name,
            description: repoData.description,
            createdAt: repoData.createdAt,
            languages: repoData.languages && repoData.languages.edges.map(({node})=>
                node.id
            ),
            labels: repoData.labels && repoData.labels.edges.map(({node})=>
                node.id
            )
        }
    }
    langLdifs = repoData.languages && repoData.languages.edges.filter(({node})=> !existingLanguagesIds.includes(node.id)).map(({node}) => {
            existingLanguagesIds.push(node.id)
            return {
                type: 'Language',
                id: node.id,
                data: {
                    name: node.name
                }
            }
    })
    labelLdifs = repoData.labels && repoData.labels.edges.filter(({node})=> !existingLabelsIds.includes(node.id)).map(({node}) => {
            existingLabelsIds.push(node.id)
            return {
                type: 'Label',
                id: node.id,
                data: {
                    name: node.name,
                    color: node.color,
                    description: node.description
                }
            }
    })
    console.log("LINE 2070, LDIF for REPO is ", ldif)
    console.log("LINE 2071, LDIF for LANG is ", langLdifs)
    console.log("LINE 2072, LDIF for LABEL is ", labelLdifs)
    return [[ldif, ...langLdifs, ...labelLdifs], existingLanguagesIds, existingLabelsIds];
}
