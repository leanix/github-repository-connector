/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 */

const df = require("durable-functions");

// the three types of visibilities present in github
const REPO_VISIBILITY_TYPES = {
    PUBLIC : 'public',
    PRIVATE : 'private',
    INTERNAL : 'internal'
}

module.exports = df.orchestrator(function* (context) {
    const {
        orgName,
        ghToken,
        workspaceId,
        containerName,
    } = context.bindingData.input;
    const scannerCapacity = 100;

    // storing ghToken in env so that the token is not logged or stored during activity function calls
    process.env['ghToken'] = ghToken;

    const repositoriesIds = yield context.df.callActivity("GetAllRepositoriesForOrg", {orgName});

    const workPerScanner = [];
    for (let i = 0, j = repositoriesIds.length; i < j; i += scannerCapacity) {
        workPerScanner.push(repositoriesIds.slice(i, i + scannerCapacity));
    }

    const output = []
    for (let i = 0; i < workPerScanner.length; i++) {
        // This will starts Activity Functions in parallel
        output.push(
            context.df.callActivity('GetSubReposData', workPerScanner[i])
        )
    }

    const partialResults = yield context.df.Task.all(output)
    try {
        var teamResults = yield context.df.callActivity('GetOrgTeamsData', {orgName});
    } catch (e) {
        context.log(e);
        teamResults = [];
    }


    const repoVisibilityOutput = []
    for (let visibilityType of Object.values(REPO_VISIBILITY_TYPES)) {
        repoVisibilityOutput.push(
            context.df.callActivity('GetReposVisibilityData', {orgName, visibilityType})
        )
    }
    try {
        var repoVisibilityPartialResults = yield context.df.Task.all(repoVisibilityOutput)
        var repoIdsVisibilityMap = {}
        for (let visibilityResult of repoVisibilityPartialResults) {
            repoIdsVisibilityMap = {...repoIdsVisibilityMap, ...visibilityResult}
        }
    } catch (e) {
        context.log(e);
        repoIdsVisibilityMap = {};
    }

    return yield context.df.callActivity('SaveLdifToStorage', {partialResults, teamResults, repoIdsVisibilityMap, workspaceId, containerName});
});
