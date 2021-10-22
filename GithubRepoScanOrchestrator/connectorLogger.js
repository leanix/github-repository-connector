const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
export class ConnectorLogger {

    blockBlobClient = null;

    constructor(loggingUrl) {
        if (loggingUrl !== undefined) {
            this.blockBlobClient = new BlobClient(loggingUrl, new AnonymousCredential()).getAppendBlobClient();
            console.log(`*** logging to URL: ${loggingUrl} ***`);
        }
    }

    async log(message) {

        console.log(message)

        if (this.blockBlobClient != null) {
            this.blockBlobClient.createIfNotExists()
                .then(res => {
                    var messageStr = (typeof message === "string") ? message : JSON.stringify(message, undefined, 2);
                    messageStr += '\n';
                    this.blockBlobClient.appendBlock(messageStr, messageStr.length);
                })
        }
    }
}