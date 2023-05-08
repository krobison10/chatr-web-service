'use strict'

/**
 * Helper method to validate that a password meets the requirements of the database.
 * 
 * @param {string} password the password string to check.
 * 
 * @returns {boolean} true if the password meets the requirements.
 */
function checkPassword(password) {
    //Length check
    if(password.length < 8 || password.length > 255) return false;
    
    /**
     * Contains at least one digit
     * 
     * Contains at least one uppercase letter
     * 
     * Contains at least one lowercase letter
     * 
     * Contains at least one of the special characters:
     * ()|¬¦!£$%^&*<>;#~_\-+=@
     */
    const regex = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[()|¬¦!£$%^&*<>;#~_\-+=@]).*$/;
    return regex.test(password);
}

module.exports = { 
    checkPassword
}