const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
const logStatus = {
	INFO: 'INFO',
	ERROR: 'ERROR'
};

var ConnectorLoggerFactory = (function () {
	class ConnectorLogger {
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
				await this.blockBlobClient.createIfNotExists();
				const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					`${new Date().toISOString()} ${logStatus.INFO.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
					messageStr.length
				);
			} else {
				context.log('Error: Connector Url Blob Client not initialized');
			}
		}

		async logError(context, message) {
			context.log(message);

			if (this.blockBlobClient) {
				await this.blockBlobClient.createIfNotExists();
				const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					`${new Date().toISOString()} ${logStatus.ERROR.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
					messageStr.length
				);
			} else {
				context.log('Connector Log Error: Connector Url Blob Client not initialized');
			}
		}
	}

	var loggerInstance;
	return {
		getInstance: function (connectorLoggingUrl, runId) {
			if (loggerInstance == null) {
				loggerInstance = new ConnectorLogger(connectorLoggingUrl, runId);
			}
			return loggerInstance;
		},
		getConnectorLogger: function () {
			return loggerInstance;
		}
	};
})();

module.exports = { ConnectorLoggerFactory };
