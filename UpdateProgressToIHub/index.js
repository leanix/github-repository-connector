/*
* Updates progress status to Integration Hub
 */
const axios = require('axios');
const {iHubStatus} = require("../GithubRepoScanOrchestrator/helper");

module.exports = async function (context, {progressCallbackUrl, status, message}) {
    const callbackUrl = progressCallbackUrl.startsWith("http") ? `https${progressCallbackUrl.split('http')[1]}` : progressCallbackUrl

    try {
        const response = await axios.post(callbackUrl, {
            status,
            message
        })
        context.log(`Updated ${status} status to Integration Hub`, response.status);
    } catch (e) {
        context.log('Failed to update progress to Integration Hub. Callback Url: ', callbackUrl, 'Error message:', e.message);
        if (status !== iHubStatus.IN_PROGRESS) {
            throw e
        }
    }
};
