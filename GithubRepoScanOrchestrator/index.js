/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 */

const df = require("durable-functions");
const {decryptGHToken, iHubStatus} = require("./helper");

function* processForLdif(context) {
    const {
        connectorConfiguration: {
            orgName,
            ghToken,
        },
        ldifResultUrl,
        progressCallbackUrl
    } = context.bindingData.input;
    const scannerCapacity = 100;

    // storing ghToken in env so that the token is not logged or stored during activity function calls
    process.env['ghToken'] = decryptGHToken(ghToken);

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
    const repoVisibilities = ['private', 'public', 'internal']
    for (let visibilityType of repoVisibilities) {
        repoVisibilityOutput.push(
            context.df.callActivity('GetReposVisibilityData', {orgName, visibilityType})
        )
    }
    try {
        const repoVisibilityPartialResults = yield context.df.Task.all(repoVisibilityOutput)
        var repoIdsVisibilityMap = {}
        for (let visibilityResult of repoVisibilityPartialResults) {
            repoIdsVisibilityMap = {...repoIdsVisibilityMap, ...visibilityResult}
        }
    } catch (e) {
        context.log(e);
        repoIdsVisibilityMap = {};
    }

    yield context.df.callActivity("UpdateProgressToIHub", {
        progressCallbackUrl,
        status: iHubStatus.IN_PROGRESS,
        message: "Successfully requested the data from GitHub"
    });

    yield context.df.callActivity('SaveLdifToStorage', {
        partialResults,
        teamResults,
        repoIdsVisibilityMap,
        blobStorageSasUrl: ldifResultUrl
    });
}

module.exports = df.orchestrator(function* (context) {
    const {
        progressCallbackUrl
    } = context.bindingData.input;

    const retryOptions =
        new df.RetryOptions(5000, 3);

    try {
        yield* processForLdif(context)
        yield context.df.callActivityWithRetry("UpdateProgressToIHub", retryOptions, {progressCallbackUrl, status: iHubStatus.FINISHED});
    } catch (e) {
        context.log(e)
        yield context.df.callActivityWithRetry("UpdateProgressToIHub", retryOptions, {
            progressCallbackUrl,
            status: iHubStatus.FAILED,
            message: e.message
        });
    }
});
