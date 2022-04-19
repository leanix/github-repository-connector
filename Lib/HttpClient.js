const UpdateProgressToIHub = require('../UpdateProgressToIHub');
const IHubStatus = require('./IHubStatus');
const { DateTime } = require('luxon');
const axios = require('axios');
const Agent = require('agentkeepalive');
const RETRY_WAIT = 10; // 10 seconds

class HttpClient {
	constructor() {
		this.lastUpdated = DateTime.now();
		this.axiosInstance = axios.create({
			httpAgent: new Agent({ maxSockets: 10, timeout: 60000, freeSocketTimeout: 30000 })
		});
	}

	setLogger(logger, context, progressCallbackUrl) {
		this.connectorLogger = logger;
		this.context = context;
		this.progressCallbackUrl = progressCallbackUrl;
	}

	queryPostFn() {
		return this.query();
	}

	query() {
		return async (url, headers, data, iHubUpdateStatusMessage = 'In Progress') => {
			if (this.lastUpdated.diffNow('minutes').minutes < -5) {
				await UpdateProgressToIHub(this.context, {
					progressCallbackUrl: this.progressCallbackUrl,
					status: IHubStatus.IN_PROGRESS,
					message: iHubUpdateStatusMessage
				});
				this.lastUpdated = DateTime.now();
			}
			try {
				return await this.axiosInstance.post(url, data, { headers: headers });
			} catch (error) {
				if (
					error.message.includes('Request failed with status code 429') ||
					error.message.includes('EAI_AGAIN') ||
					error.message.includes('ETIMEDOUT') ||
					error.message.includes('Client network socket disconnected')
				) {
					if (this.connectorLogger) {
						await this.connectorLogger.logInfo(this.context, 'Events API rate limit exceeded. Attempting to automatically recover.');
					}
					await UpdateProgressToIHub(this.context, {
						progressCallbackUrl: this.progressCallbackUrl,
						status: IHubStatus.IN_PROGRESS,
						message: 'Connector Idle: Automatically recovering from rate limiting'
					});
					await sleep(RETRY_WAIT * 1000);
					await UpdateProgressToIHub(this.context, {
						progressCallbackUrl: this.progressCallbackUrl,
						status: IHubStatus.IN_PROGRESS,
						message: 'Connector Awake: retrying to register event'
					});
					this.lastUpdated = DateTime.now();
					let response = await this.axiosInstance.post(url, data, { headers: headers });
					if (200 <= response.status < 300) {
						return response.data;
					}
				}
				throw new Error('Events API error! Could not register event. Error: ' + error);
			}
		};
	}
}

async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

module.exports = HttpClient;
