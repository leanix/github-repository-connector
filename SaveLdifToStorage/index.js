/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */
const {ContainerClient} = require("@azure/storage-blob");

module.exports = async function (context, {partialResults, GetOrgTeamsData, containerSasUrl, workspaceId}) {
    const combinedResults = partialResults.flatMap(partial => partial);
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
