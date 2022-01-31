const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
const logStatus = {
	INFO: 'INFO',
	ERROR: 'ERROR'
};

class ConnectorLogger {
	constructor(connectorLoggingUrl, runId) {
		if (process.env.LX_DEV_SKIP_IHUB_LOGGING) {
			return;
		}
		if (connectorLoggingUrl === undefined) {
			throw new Error('Error: Connector Logging Url is empty');
		}
		if (connectorLoggingUrl) {
			this.blockBlobClient = new BlobClient(connectorLoggingUrl, new AnonymousCredential()).getAppendBlobClient();
		}
		this.runId = runId;
	}

	async logInfo(context, message) {
		context.log(message);
		if (process.env.LX_DEV_SKIP_IHUB_LOGGING || this.runId === -1) {
			return;
		}
		if (this.blockBlobClient) {
			try {
				await this.blockBlobClient.createIfNotExists();
				const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					`${new Date().toISOString()} ${logStatus.INFO.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
					messageStr.length
				);
			} catch (err) {
				context.log(`Connector Log Error:  ${err.message}`);
			}
		} else {
			context.log('Error: Connector Url Blob Client not initialized');
		}
	}

	async logInfoFromOrchestrator(context, isReplaying, message) {
		if (!isReplaying) {
			context.log(message);
		}

		if (process.env.LX_DEV_SKIP_IHUB_LOGGING || this.runId === -1) {
			return;
		}

		if (!isReplaying) {
			if (this.blockBlobClient) {
				try {
					await this.blockBlobClient.createIfNotExists();
					const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
					await this.blockBlobClient.appendBlock(
						`${new Date().toISOString()} ${logStatus.INFO.toString()}: [Run ID: ${this.runId.toString()}] ${messageStr}\n`,
						messageStr.length
					);
				} catch (err) {
					context.log(`Connector Log Error:  ${err.message}`);
				}
			} else {
				context.log('Error: Connector Url Blob Client not initialized');
			}
		}
	}

	async logError(context, message) {
		context.log(message);
		if (process.env.LX_DEV_SKIP_IHUB_LOGGING || this.runId === -1) {
			return;
		}

		if (this.blockBlobClient) {
			try {
				await this.blockBlobClient.createIfNotExists();
				const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					`${new Date().toISOString()} ${logStatus.ERROR.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
					messageStr.length
				);
			} catch (err) {
				context.log(`Connector Log Error:  ${err.message}`);
			}
		} else {
			context.log('Connector Log Error: Connector Url Blob Client not initialized');
		}
	}
}

function getLoggerInstanceFromContext(context) {
	if (context.bindingData.input) {
		return new ConnectorLogger(context.bindingData.input.connectorLoggingUrl, context.bindingData.input.runId);
	} else if (context.bindingData.connectorLoggingUrl && context.bindingData.runId) {
		return new ConnectorLogger(context.bindingData.connectorLoggingUrl, context.bindingData.runId);
	} else if (context.bindingData.testConnector === 'True' || context.bindingData.testConnector === true) {
		return new ConnectorLogger(null, -1);
	} else {
		throw new Error('Error: Connector Logging Url and RunId not found in context.bindingData');
	}
}

function getLoggerInstanceFromUrlAndRunId(connectorLoggingUrl, runId) {
	return new ConnectorLogger(connectorLoggingUrl, runId);
}

module.exports = { getLoggerInstanceFromContext, getLoggerInstanceFromUrlAndRunId };
