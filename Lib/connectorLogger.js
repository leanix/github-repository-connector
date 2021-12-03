const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
const { getISODateStringOnFromToday } = require('./helper');

class ConnectorLogger {
	blockBlobClient = null;
	runId = null;
	logStatus = {
		INFO: 'INFO',
		WARNING: 'WARNING',
		ERROR: 'ERROR'
	};
	logDate = null;

	constructor(connectorLoggingUrl, runId) {
		if (connectorLoggingUrl !== undefined) {
			if (!this.blockBlobClient)
				this.blockBlobClient = new BlobClient(connectorLoggingUrl, new AnonymousCredential()).getAppendBlobClient();
			this.runId = runId;
			this.logDate = new Date();
		} else {
			context.log('Error: Connector Logging Url is empty');
		}
	}

	async logInfo(context, message) {
		context.log(message);

		if (this.blockBlobClient) {
			this.blockBlobClient.createIfNotExists().then(async (res) => {
				var messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					this.logDate.toISOString() +
						' ' +
						this.logStatus.INFO.toString() +
						':' +
						' [ Run ID: ' +
						this.runId.toString() +
						'] ' +
						messageStr +
						'\n',
					messageStr.length
				);
			});
		} else {
			context.log('Error: Connector Url Blob Client not initialized');
		}
	}

	async logWarning(context, message) {
		context.log(message);

		if (this.blockBlobClient) {
			this.blockBlobClient.createIfNotExists().then(async (res) => {
				var messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);

				await this.blockBlobClient.appendBlock(
					this.logDate.toISOString() +
						' ' +
						this.logStatus.WARNING.toString() +
						':' +
						' [ Run ID: ' +
						this.runId.toString() +
						'] ' +
						messageStr +
						'\n',
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
				var messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				await this.blockBlobClient.appendBlock(
					this.logDate.toISOString() +
						' ' +
						this.logStatus.ERROR.toString() +
						':' +
						' [ Run ID: ' +
						this.runId.toString() +
						'] ' +
						messageStr +
						'\n',
					messageStr.length
				);
			});
		} else {
			context.log('Error: Connector Url Blob Client not initialized');
		}
	}
}

module.exports = ConnectorLogger;
