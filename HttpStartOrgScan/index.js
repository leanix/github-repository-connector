const df = require("durable-functions");

module.exports = async function (context, req) {
    const client = df.getClient(context)
    const params = req.body;
    let azureCallId = params.azureCallId;

    try {
        if (!azureCallId) {
            azureCallId = await client.startNew("GithubRepoScanOrchestrator", undefined, params.customConfiguration);
            context.log(`Started orchestration with ID = '${azureCallId}'.`);
        }

        const status = await client.getStatus(azureCallId);
        return getCustomStatusResponse(status, context, azureCallId);
    } catch (e) {
        context.log(`Exception caught: ${e}`)
        return buildResponseBody("?", "FAILED", {"message": `Unknown exception caught: ${e}`}, 500)
    }
};

function getCustomStatusResponse(status, context, azure_call_id) {
    if (status.runtimeStatus === df.OrchestrationRuntimeStatus.Completed) {
        const data = {
            output: status.output
        }
        context.log('Orchestrator reached status {status.runtimeStatus} - returning \'FINISHED\' response')
        return buildResponseBody(azure_call_id, "FINISHED", data, 200)
    } else if (status.runtimeStatus === df.OrchestrationRuntimeStatus.Pending ||
        status.runtimeStatus === df.OrchestrationRuntimeStatus.Running ||
        status.runtimeStatus === df.OrchestrationRuntimeStatus.ContinuedAsNew) {
        // orchestrator still in progress - construct IN_PROGRESS response
        context.log('Orchestrator reached status {status.runtimeStatus} - returning \'IN_PROGRESS\' response')
        return buildResponseBody(azure_call_id, "IN_PROGRESS", status, 200)
    } else {
        //orchestrator reached other (error) state - construct FAILED response
        context.log("Orchestrator reached status {status.runtime_status} - returning 'FAILED' response")
        return buildResponseBody(azure_call_id, "FAILED", status, 200)
    }
}

function buildResponseBody(azure_call_id, status, data, status_code) {
    return {
        status: status_code,
        body: {
            "azureCallId": azure_call_id,
            "status": status,
            "data": data
        },
    }
}
