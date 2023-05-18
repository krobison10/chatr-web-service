const {Client} = require("@googlemaps/google-maps-services-js");
const client = new Client({});
const config = require("../config.js");
const isZipCode = require('./validationUtils.js').isZipCode;
module.exports = {
    /**
     * Returns the latitude and longitude of a given zipcode via a {@link LatLngLiteral} in the form {lat, lng}.
     * @param {String} zipcode the zipcode to get the lat/long of as a string.
     * @returns the latitude and longitude of the given zipcode in the form {lat, lng}.
     */
    getLatLong: (zipcode) => {
        if (isZipCode(zipcode)) return client.geocode({
            params: {
                address: zipcode,
                key: config.GOOGLE_MAPS_API_KEY
            },
            timeout: 1000 // milliseconds
        })
        .then((result) => {
            return result.data.results[0].geometry.location;
        })
        .catch((error) => {
            console.log(error.response.data.error_message);
        });
    },
}