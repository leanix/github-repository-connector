module.exports = {
  checkRegexBlacklist: function (regexBlacklist) {
    if (regexBlacklist) {
      let regexBlacklistArray = regexBlacklist.split(",");
      return regexBlacklistArray.map((regexString) => new RegExp(regexString));
    }
    return [];
  },
};
