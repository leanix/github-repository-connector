module.exports = {
	checkRegexExcludeList: function (regexExcludeList) {
		if (regexExcludeList) {
			let regexExcludeListArray = regexExcludeList.split(',');
			try {
				return regexExcludeListArray.map((regexString) => new RegExp(regexString));
			} catch (error) {
				throw new Error('A regular expression provided in the input field repoNamesExcludeList is invalid. Please check your input!');
			}
		}
		return [];
	}
};
