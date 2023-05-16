// TODO: Add validation functions for isNumericProvided, isValidPassword, isValidEmail, etc.

module.exports = { 
    /**
    * Checks the parameter to see if it is a String with a length greater than 0.
    * @param {string} param The parameter to check.
    * @returns True if the parameter is a String with a length greater than 0, false otherwise.
    */
    isStringProvided: (param) => {
        return param !== undefined && param.length > 0;
    },
    /**
     * Returns whether the given parameter is in the format of latitude,longitude.
     * @param {String} param The parameter to check.
     * @returns Whether the given parameter is in the format of latitude,longitude.
     */
    isLatLong: (param) => {
        return /^-?([1-8]?\d(\.\d+)?|90(\.0+)?),-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/.test(param);
    },
    /**
     * Returns whether the given parameter is in the format of a zip or zip+4 code.
     * @param {String} param The parameter to check.
     * @returns Whether the given parameter is in the format of a zip or zip+4 code.
     */
    isZipCode: (param) => {
        return /^\d{5}(?:-\d{4})?$/.test(param);
    },
}