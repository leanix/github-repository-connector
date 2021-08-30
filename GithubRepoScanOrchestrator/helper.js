module.exports = {
	checkRegexExcludeList: function (regexExcludeList) {
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
	},
	iHubStatus: {
		IN_PROGRESS: 'IN_PROGRESS',
		FINISHED: 'FINISHED',
		FAILED: 'FAILED'
	},
	iHubProgressOrigin: {
		CONNECTOR: 'CONNECTOR'
	}
};
