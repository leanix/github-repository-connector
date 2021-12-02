const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const TestConnectorValidator = require('../TestConnector');

module.exports = async function (context, req) {
	const client = df.getClient(context);
	const input = req.body;

	if (input.testConnector) {
		try {
			await TestConnectorValidator(context, input);
			return buildResponseBody({ message: 'Ready!' });
		} catch (e) {
			context.log('Test connector checks failed, returning...');
			return buildResponseBody({ message: e.message }, 404);
		}
	}

	const instanceId = await client.startNew('GithubRepoScanOrchestrator', input.runId, input);

	context.log(`Started orchestration with ID = '${instanceId}'. run ID = ${input.runId}`);

	return buildResponseBody({ runId: input.runId, status: iHubStatus.IN_PROGRESS });
};

function buildResponseBody(data, status = 200) {
	return {
		headers: { 'Content-Type': 'application/json; charset=UTF-8' },
		body: data,
		status
	};
}
