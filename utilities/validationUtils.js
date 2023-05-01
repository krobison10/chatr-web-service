// TODO: Add validation functions for isNumericProvided, isValidPassword, isValidEmail, etc.

module.exports = { 
    /**
    * Checks the parameter to see if it is a a String with a length greater than 0.
    * @param {string} param the value to check
    * @returns true if the parameter is a String with a length greater than 0, false otherwise
    */
    isStringProvided: (param) => {
        return param !== undefined && param.length > 0;
    },
}