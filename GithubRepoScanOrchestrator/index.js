﻿/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 */

const df = require("durable-functions");

module.exports = df.orchestrator(function* (context) {
    const {
        orgName,
        ghToken,
        workspaceId,
        containerSasUrl,
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
            context.df.callActivity('GetAndConvertSubReposDataToLdif', workPerScanner[i])
        )
    }

    const partialResults = yield context.df.Task.all(output)

    return yield context.df.callActivity('SaveLdifToStorage', {partialResults, workspaceId, containerSasUrl});
});
