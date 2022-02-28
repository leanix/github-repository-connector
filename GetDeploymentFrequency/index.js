const axios = require('axios');
const { getISODateStringOnFromToday } = require('../Lib/helper');
const {getAccessToken } = require('../Lib/helper')
function getOldestCommit(commits){
    let oldestCommitDate = commits[0].commit.committer.date
    let oldestCommit = commits[0]
    for(let ele of commits){
        if(oldestCommitDate > ele.commit.committer.date){
            oldestCommitDate = ele.commit.committer.date
            oldestCommit = ele
        }
    }
    return {oldestCommit: oldestCommit,
            oldestCommitDate: oldestCommitDate}
}

async function sendDeploymentsKPIToDORA(repoName, deploymentSHA, deploymentTime, author, oldestCommitSHA, oldestCommitTime, bearerToken) {
    let laxios = axios.create({
		baseURL: `https://eu.leanix.net/services/valuestreams/v1/api`,
		headers: { 
            "Ce-Specversion": "1.0",
            "Ce-Type": "net.leanix.valuestreams.change",
            "Ce-Id": oldestCommitSHA,
            "Ce-Source": "leanix/" + repoName,
            "Ce-Time": oldestCommitTime,
            "Ce-Datacontenttype": "application/json",
               "Content-Type": "application/json",
            Authorization: `Bearer ${bearerToken}` }
	});

    await laxios.post('/events',{"author": author})
    // console.log("res: ",res)

    laxios = axios.create({
		baseURL: `https://eu.leanix.net/services/valuestreams/v1/api`,
		headers: { 
            "Ce-Specversion": "1.0",
            "Ce-Type": "net.leanix.valuestreams.release",
            "Ce-Id": deploymentSHA,
            "Ce-Source": "leanix/" + repoName,
            "Ce-Time": deploymentTime,
            "Ce-Datacontenttype": "application/json",
               "Content-Type": "application/json",
            Authorization: `Bearer ${bearerToken}` }
	});

    await laxios.post('/events',{"changeIds": [oldestCommitSHA]})
    // console.log("res2", res2)

}

module.exports = async function (context, { ghToken, apiToken, host, repoName, defaultBranchName }) {
	let maxios = axios.create({
		baseURL: `https://api.github.com`,
		headers: { Authorization: `Bearer ${ghToken}` }
	});
    let pageNo = 1
    let result = null
    let finalResult = []
    do{
	result = await maxios.get(
		`/repos/leanix/${repoName}/pulls?state=closed&sort=updated&direction=desc&page=${pageNo}&per_page=100&head=leanix/${defaultBranchName}`
	);
    finalResult = [...finalResult, ...result.data]
    pageNo += 1
    }while(result.data == 100)
	let last_30d = new Date(getISODateStringOnFromToday(90));
	let rawPRs = [];
	for (let pr of result.data) {
		if (pr.merged_at) {
			var prMergedDate = new Date(pr.merged_at);
			if (prMergedDate >= last_30d) {
				rawPRs.push(pr);
			}
		}
	}
    let bearerToken = await getAccessToken(host, apiToken)

    for(let pr of rawPRs) {
        let prNo = pr.number
        let commits = await maxios.get(`/repos/leanix/${repoName}/pulls/${prNo.toString()}/commits`)
        let oldestCommitInfo = getOldestCommit(commits.data)
        await sendDeploymentsKPIToDORA(repoName,pr.head.sha, pr.merged_at, oldestCommitInfo.oldestCommit.commit.author.email, oldestCommitInfo.oldestCommit.sha, oldestCommitInfo.oldestCommitDate, bearerToken)
    }
};
