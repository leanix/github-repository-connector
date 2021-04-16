/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */

module.exports = async function (context, orgName) {
    // retrieves all ids of an organisation
    const allRepoIds = ["id1", "id2", "id3"];
    context.log('got org name ', orgName)
    context.done(null, allRepoIds);
};