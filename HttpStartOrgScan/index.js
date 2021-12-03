const df = require('durable-functions');
const iHubStatus = require('../Lib/IHubStatus');
const { ConnectorLoggerFactory } = require('../Lib/connectorLogger');
const TestConnectorValidator = require('../TestConnector');

module.exports = async function (context, req) {
	const client = df.getClient(context);
	const input = req.body;

	//Initialize Connector Logger with required params
	const logger = await ConnectorLoggerFactory.getInstance(context.bindingData.connectorLoggingUrl, context.bindingData.runId);

	if (input.testConnector) {
		try {
			await TestConnectorValidator(context, input);
			await logger.logInfo(context, 'Test connection was Successful!');
			return buildResponseBody({ message: 'Ready!' });
		} catch (e) {
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
