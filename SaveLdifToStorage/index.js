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
    let data = []
    let partialData = []
    combinedResults.map(repoData => {
        [partialData, existingLanguagesIds, existingLabelsIds] = convertToLdif(repoData, existingLanguagesIds, existingLabelsIds)
        data = [...data, ...partialData]
    })
    /* Creating one final LDIF to store into the blob after strigifying the object */
    const finalLDIF = {
        "connectorId": "github-connector",
        "connectorType": "github-connector",
        "connectorVersion": "1.0.0",
        "processingDirection": "inbound",
        "processingMode": "full",
        "lxVersion": "1.0.0",
        "description": "Map organisation github repos to LeanIX Fact Sheets",
        "content": data
    }
    context.log('stats: partial results#', partialResults.length, 'complete partial results#',
        partialResults.map(x => x.length).reduce((sum, c) => sum + c, 0), 'combined results#', combinedResults.length)

    const containerClient = new ContainerClient(containerSasUrl);

    const blobName = `${workspaceId}-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const finalLdifData = JSON.stringify(finalLDIF);

    try {
        /* Uploading the final stringified json object as a block blob */
        await blockBlobClient.upload(finalLdifData, Buffer.byteLength(finalLdifData))
    } catch (e) {
        return '__UPLOAD_FAILED';
    }
    return blobName;
};

/* covertToLdif function take a single repoData object and extracts 3 types of 
   content objects, Repository, Language and Label. To avoid repetition, already
   considered languages and labels are maintained as arrays and updated accordingly */
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
    return [[ldif, ...langLdifs, ...labelLdifs], existingLanguagesIds, existingLabelsIds];
}
