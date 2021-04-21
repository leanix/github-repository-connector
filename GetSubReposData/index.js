/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

module.exports = async function (context, repoIds) {
    context.log('partial act func called', repoIds);
    const data = getReposData(repoIds).map(convertToLdif);
    return data;
};

function getReposData(repoIds) {
    const data = [];
    return repoIds;
}

function convertToLdif(repoData) {
    const ldif = {
        id: repoData
    }
    return ldif;
}