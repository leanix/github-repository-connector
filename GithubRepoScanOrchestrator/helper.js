module.exports = {
	checkRegexExcludeListGetArray: function (regexExcludeList) {
		if (regexExcludeList) {
			let regexExcludeListArray = regexExcludeList.split(',');
			try {
				// checking the provided regurlar expressions for errors
				regexExcludeListArray.map((regexString) => new RegExp(regexString));
			} catch (error) {
				throw new Error('A regular expression provided in the input field repoNamesExcludeList is invalid. Please check your input!');
			}
			return regexExcludeListArray;
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
