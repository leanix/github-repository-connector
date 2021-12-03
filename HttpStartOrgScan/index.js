const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const ConnectorLogger = require('../Lib/connectorLogger');
const TestConnectorValidator = require('../TestConnector');

module.exports = async function (context, req) {
	const client = df.getClient(context);
	const input = req.body;
	const logger = new ConnectorLogger(context.bindingData.connectorLoggingUrl, context.bindingData.runId);
	try {
		if (input.testConnector) {
			await TestConnectorValidator(context, input);
			await logger.logInfo(context, 'Test connection was Successful!');
			return buildResponseBody({ message: 'Ready!' });
		}
	} catch (e) {
		if (input.testConnector) {
			await logger.logError(context, e.message);
			await logger.logInfo(context, 'Test connector checks failed, returning...');
			return buildResponseBody({ message: e.message }, 404);
		}
	}
	await logger.logInfo(context, 'Starting the Orchestration...');

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
