/*
 * Updates progress status to Integration Hub
 */
import { AzureFunction } from '@azure/functions';
import axios from 'axios';
const { iHubStatus, iHubProgressOrigin } = require('../GithubRepoScanOrchestrator/helper');

const activityFunction: AzureFunction = async function (context, { progressCallbackUrl, status, message }) {
	try {
		const response = await axios.post(progressCallbackUrl, {
			status,
			message,
			progressOrigin: iHubProgressOrigin.CONNECTOR
		});
		context.log(`Updated ${status} status to Integration Hub`, response.status);
	} catch (e) {
		context.log('Failed to update progress to Integration Hub. Callback Url: ', progressCallbackUrl, 'Error message:', e.message);
		if (status !== iHubStatus.IN_PROGRESS) {
			throw e;
		}
	}
};

export default activityFunction;
