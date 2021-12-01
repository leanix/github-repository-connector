const { BlobClient, AnonymousCredential } = require('@azure/storage-blob');
const { getISODateStringOnFromToday } = require('./helper')
class ConnectorLogger {
    blockBlobClient = null;
    runId = null;
    connectorLogger = null

    constructor(context) {
        if (context.bindingData.connectorLoggingUrl !== undefined) {
            if(!this.blockBlobClient)
                this.blockBlobClient = new BlobClient(context.bindingData.connectorLoggingUrl, new AnonymousCredential()).getAppendBlobClient();
            this.runId = context.bindingData.runId;
        }
    }

    static getConnectorLogger(context) {
        if(!this.connectorLogger) {
            this.connectorLogger = new ConnectorLogger(context)
        }
        return this.connectorLogger
    }

    async log(context, logStatus, message) {
        context.log(message);

        if (this.blockBlobClient != null) {
            this.blockBlobClient.createIfNotExists().then(async (res) => {
                var messageStr = typeof message === 'string' ? message : JSON.stringify(message, undefined, 2);
                messageStr += '[ IHub Run ID: ' + this.runId.toString() + ']\n';
                await this.blockBlobClient.appendBlock(
                    getISODateStringOnFromToday() + ' ' + logStatus.toString() + ':' + messageStr,
                    messageStr.length
                );
            });
        }
    }
    
}

module.exports = ConnectorLogger;