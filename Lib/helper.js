class Util {
	static checkRegexExcludeList(regexExcludeList) {
		if (regexExcludeList) {
			try {
				// checking the provided regurlar expressions for errors
				regexExcludeList.map((regexString) => new RegExp(regexString));
			} catch (error) {
				throw new Error('A regular expression provided in the input field repoNamesExcludeList is invalid. Please check your input!');
			}
			return regexExcludeList;
		}
		return [];
	}

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
}

module.exports = Util;
