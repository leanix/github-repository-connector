class Util {
	static getISODateStringOnFromToday(daysBack = 30) {
		const today = new Date();
		return new Date(today.setDate(today.getDate() - daysBack)).toISOString();
	}

	static externalId() {
		return {
			repository: function (orgName, repoData) {
				/**
				 * OrgName and repo name are sanitised(no spaces) at source (GitHub)
				 */
				if (!orgName || !repoData) {
					throw new Error('Failed to generate repository external ID');
				}
				return `${orgName}/${repoData.name}`;
			},
			subRepository: function (orgName, repoData) {
				return `${orgName}/${repoData.monoRepoName}/${repoData.name}`;
			},
			team: function (orgName, teamData) {
				if (!orgName || !teamData) {
					throw new Error('Failed to generate team external ID');
				}
				return `${orgName}/${teamData.name}`;
			},
			language: function (langData) {
				if (!langData) {
					throw new Error('Failed to generate language external ID');
				}
				return `${langData.name.toLowerCase()}`;
			}
		};
	}

	static filterNonOrgReposFromTeam(orgRepositoriesIds) {
		function containsInOrgRepos(repoId) {
			return orgRepositoriesIds.find((id) => id === repoId);
		}

		return function (teamRepositories) {
			return teamRepositories.filter((repo) => containsInOrgRepos(repo.id));
		};
	}

	static verifyTeamReposDataLimit(data) {
		const allTeamsReposToBeFetchedCount = data.reduce((count, team) => {
			return count + team.repositories.totalCount;
		}, 0);

		/*
		 * Limit calculation rationale:
		 * 1. Azure function fails with 'Singleton lock renewal failed for blob xxx/host with error code 409' when teams = 192 and repos / team = 2600
		 * 2. Setting the upper limit to 400_000 to avoid the above issue
		 * 3. If this limit is reached and the execution fails with same error. Set new upper limit close to new data.
		 * */
		if (allTeamsReposToBeFetchedCount >= 400_000) {
			throw new Error(
				`Data processing limit exceeded. Processed records for teams data: ${allTeamsReposToBeFetchedCount} exceeded processing limit: 400000 records. Please try again with less number of teams and repositories. Hint: Please turn off the "importTeams" flag`
			);
		}
	}

	static isRateLimitExceededError(e) {
		if (!e) {
			return [false];
		}
		if (!e.headers) {
			return [false];
		}
		const isExceeded =
			e.name === 'GraphqlError' && (parseInt(e.headers['x-ratelimit-remaining']) === 0 || e.message.includes('API rate limit'));
		return [isExceeded, e.headers['x-ratelimit-reset']];
	}
}

module.exports = Util;
