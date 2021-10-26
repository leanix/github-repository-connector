const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
module.exports = {
	createLogger: function (connectorLoggingUrl) {
		return new BlobClient(connectorLoggingUrl, new AnonymousCredential()).getAppendBlobClient();
	},

	log: async function (blobClient, logLevel, message, context) {
		context.log(message);
		date = new Date();
		if (blobClient != null) {
			blobClient.createIfNotExists().then(async (res) => {
				var messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
				messageStr += '\n';
				await blobClient.appendBlock(date.toISOString() + ' ' + logLevel + ':' + messageStr, messageStr.length);
			});
		}
	}
};
