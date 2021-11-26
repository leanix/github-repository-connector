const df = require('durable-functions');
const { iHubStatus } = require('../GithubRepoScanOrchestrator/helper');

export default async function (context, req) {
	const client = df.getClient(context);
	const input = req.body;

	const instanceId = await client.startNew('GithubRepoScanOrchestrator', input.runId, input);

	context.log(`Started orchestration with ID = '${instanceId}'. run ID = ${input.runId}`);

	return buildResponseBody({ runId: input.runId, status: iHubStatus.IN_PROGRESS });
}

function buildResponseBody(data) {
	return {
		headers: { 'Content-Type': 'application/json; charset=UTF-8' },
		body: data
	};
}
