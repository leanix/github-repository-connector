const { graphql } = require('@octokit/graphql');
const { ConnectorLogger, LogStatus } = require('../GithubRepoScanOrchestrator/connectorLogger');

async function checkGithubStatus(context, graphqlClient) {

	const data = await graphqlClient({
		query: `
			query { 
				viewer { 
					login
				}
			}
		`
	});
	context.log("Data from Login", data)
	if(data){
		return true
	} else {
		return false
	}
}

module.exports = async function (context, { ghToken, connectorLoggingUrl, runId }) {
	const graphqlClient = graphql.defaults({
		headers: {
			authorization: `token ${ghToken}`
		}
	});
	const logger = new ConnectorLogger(connectorLoggingUrl, context, runId);
	await logger.log(LogStatus.INFO, "------------------------TESTING GITHUB CONNECTION-------------------")
	const connectionAlive = await checkGithubStatus(context, graphqlClient);
	if(connectionAlive){
		logger.log(LogStatus.INFO,"Connection to GitHub Successful!")
	} else {
		logger.log(LogStatus.ERROR,"Connection to GitHub Failure")
	}
	context.done(null, connectionAlive);
};
