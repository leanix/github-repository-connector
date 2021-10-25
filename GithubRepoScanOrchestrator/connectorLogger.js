const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
module.exports = { ConnectorLogger: class{

    blockBlobClient = null;
    context = null;
    date = new Date()
    constructor(loggingUrl, context) {
        if (loggingUrl !== undefined) {
            this.blockBlobClient = new BlobClient(loggingUrl, new AnonymousCredential()).getAppendBlobClient();
            this.context = context
        }
    }

    async * log(message) {

        this.context.log(message)

        if (this.blockBlobClient != null) {
            this.blockBlobClient.createIfNotExists()
                .then(async res => {
                    var messageStr = (typeof message === "string") ? message : JSON.stringify(message, undefined, 2);
                    messageStr += '\n';
                    await this.blockBlobClient.appendBlock(this.date.toISOString() + messageStr, messageStr.length);
                })
        }
    }
}
}