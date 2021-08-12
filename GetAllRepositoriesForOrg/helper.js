module.exports = {
  checkRegexExcludeList: function (regexExcludeList) {
    if (regexExcludeList) {
      let regexExcludeListArray = regexExcludeList.split(",");
      return regexExcludeListArray.map((regexString) => new RegExp(regexString));
    }
    return [];
  },
};
