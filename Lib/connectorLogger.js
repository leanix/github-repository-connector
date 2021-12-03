const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');

var ConnectorLoggerFactory = (function () {
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
				this.blockBlobClient.createIfNotExists().then(async (res) => {
					const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
					await this.blockBlobClient.appendBlock(
						`${new Date().toISOString()} ${ConnectorLogger.logStatus.INFO.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
						messageStr.length
					);
				});
			} else {
				context.log('Error: Connector Url Blob Client not initialized');
			}
		}

		async logError(context, message) {
			context.log(message);

			if (this.blockBlobClient) {
				this.blockBlobClient.createIfNotExists().then(async (res) => {
					const messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
					await this.blockBlobClient.appendBlock(
						`${new Date().toISOString()} ${ConnectorLogger.logStatus.ERROR.toString()}: [ Run ID: ${this.runId.toString()}] ${messageStr}\n`,
						messageStr.length
					);
				});
			} else {
				context.log('Connector Log Error: Connector Url Blob Client not initialized');
			}
		}
	}

	var newLogger;
	return {
		getInstance: function (connectorLoggingUrl, runId) {
			if (newLogger == null) {
				newLogger = new ConnectorLogger(connectorLoggingUrl, runId);
			}
			return newLogger;
		},
		getConnectorLogger: function () {
			return newLogger;
		}
	};
})();

module.exports = { ConnectorLoggerFactory };
