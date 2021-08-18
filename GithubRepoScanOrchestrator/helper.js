const CryptoJS = require('crypto-js');

module.exports = {
	decryptGHToken: function decrypt(encrypted) {
		const pass = process.env['LX_ENCRYPTION_PASSPHRASE'];
		try {
			const decrypted = CryptoJS.AES.decrypt(encrypted, pass);
			return CryptoJS.enc.Utf8.stringify(decrypted).trim();
		} catch (e) {
			throw new Error('Failed to correctly decrypt github token');
		}
	},
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
