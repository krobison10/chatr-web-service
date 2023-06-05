const crypto = require("crypto");

module.exports = { 
    /**
     * Creates a salted and hashed string of hexadecimal characters. Used to encrypt
     * "safely" store user passwords.
     * @param {string} pw the password to hash
     * @param {string} salt the salt to use when hashing
     */
    generateHash: (pw, salt) => {
        return crypto.createHash("sha256").update(pw + salt).digest("hex");
    }, 
    /**
     * Creates a random string of hexadecimal characters with the length of size.
     * @param {string} size the size (in bits) of the salt to create 
     * @returns random string of hexadecimal characters
     */
    generateSalt: (size) => {
        return crypto.randomBytes(size).toString("hex");
    },
    /**
     * Creates a random password that meets the requirements of the database.
     * @returns a randomly generated password that meets the requirements of the database.
     */
    generatePassword: () => {
        const chars = [
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "0123456789",
            "()|¬¦!£$%^&*<>;#~_\-+=@",
        ];
        let password = chars.map(set => set[Math.floor(Math.random() * set.length)]).join('');
        while (password.length < 16) {
            const set = chars[Math.floor(Math.random() * chars.length)];
            password += set[Math.floor(Math.random() * set.length)];
        }
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}