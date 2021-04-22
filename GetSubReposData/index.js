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
    const data = getReposData(repoIds)
    return data;
};

function getReposData(repoIds) {
    //storing dummy data of 20 repos with languages and labels populated
    const data = []
    return data;
}