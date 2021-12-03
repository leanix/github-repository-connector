const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');

class ConnectorLogger {
	static logStatus = {
		INFO: 'INFO',
		WARNING: 'WARNING',
		ERROR: 'ERROR'
	};

	blockBlobClient = null;
	runId = null;

	constructor(connectorLoggingUrl, runId) {
		if (!connectorLoggingUrl) {
			throw new Error('Error: Connector Logging Url is empty');
		}
		this.blockBlobClient = new BlobClient(connectorLoggingUrl, new AnonymousCredential()).getAppendBlobClient();
		this.runId = runId;
	}

	async logInfo(context, message) {
		context.log(message);

		if (this.blockBlobClient) {
			const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
			await this.blockBlobClient.appendBlock(
				`${new Date().toISOString()} ${ConnectorLogger.logStatus.INFO.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}`,
				messageStr.length
			);
		} else {
			context.log('Error: Connector Url Blob Client not initialized');
		}
	}

	async logError(context, message) {
		context.log(message);

		if (this.blockBlobClient) {
			const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
			await this.blockBlobClient.appendBlock(
				`${new Date().toISOString()} ${ConnectorLogger.logStatus.ERROR.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}`,
				messageStr.length
			);
		} else {
			context.log('Connector Log Error: Connector Url Blob Client not initialized');
		}
	}
}

module.exports = ConnectorLogger;
