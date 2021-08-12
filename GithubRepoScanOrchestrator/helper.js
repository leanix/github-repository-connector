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
	iHubStatus: {
		IN_PROGRESS: 'IN_PROGRESS',
		FINISHED: 'FINISHED',
		FAILED: 'FAILED'
	}
};
