/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */

module.exports = async function (context, partialResults) {
    const combinedResults = partialResults.flatMap(partial => partial);

    // save to required azure storage

    // send sas url
    return `sas-url`;
};