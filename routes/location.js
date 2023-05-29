/**
 * Framework used to handle requests,
 */
const express = require("express");
const router = express.Router();
const pool = require("../utilities").pool;

const { isNumberProvided: isNumberProvided, isStringProvided, isLatLong } = require("../utilities/exports").validation;

/**
 * @api {get} /location Get Member Locations
 * @apiName GetMemberLocations
 * @apiGroup Location
 *
 * @apiSuccess {Boolean} success Indicates if the request was successful.
 * @apiSuccess {Object[]} locations Array of location objects.
 *
 * @apiUse JSONError
 * @apiError (400: Error Occurred) {String} message "Error occurred while retrieving location."
 * @apiError (404: Not Found) {String} message "Location not found."
 */
router.get("/", async (request, response) => {
    const theQuery = `SELECT *
                      FROM Locations
                      WHERE MemberID = $1`;
    const values = [
        request.decoded.memberid,
    ];
    pool
        .query(theQuery, values)
        .then((result) => {
            response.status(200).send({
                success: true,
                locations: result.rows,
            });
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "Error occurred while retrieving location.",
                detail: error.detail,
            });
        });
});

/**
 * @api {post} /location Add Location
 * @apiName AddLocation
 * @apiGroup Location
 *
 * @apiParam {String} nickname Nickname of the location.
 * @apiParam {Number} lat Latitude of the location.
 * @apiParam {Number} lng Longitude of the location.
 *
 * @apiSuccess {Boolean} success Indicates if the location was added successfully.
 * @apiSuccess {String} message Success message.
 * @apiSuccess {Object} location The added location object.
 *
 * @apiUse JSONError
 * @apiError (400: Missing required information) {String} message "Missing required information."
 * @apiError (400: Invalid Parameters) {String} message "Location is not valid."
 */
router.post("/", async (request, response, next) => {
    request.params.location = request.params.location;
    if (
        isStringProvided(request.body.nickname)
        && isNumberProvided(request.body.lat)
        && isNumberProvided(request.body.lng)
    ) {
        next();
    } else {
        console.log('body:', request.body);
        response.status(400).send({
            message: "Missing required information.",
        });
    }
},
(request, response, next) => {
    if (isLatLong(`${request.body.lat},${request.body.lng}`)) {
        next();
    } else {
        response.status(400).send({
            message: "Location is not valid.",
        });
    }
},
(request, response) => {
    const theQuery = `INSERT INTO Locations (MemberID, Nickname, Lat, Long)
                      VALUES ($1, $2, $3, $4)
                      RETURNING *`;
    const values = [
        request.decoded.memberid,
        request.body.nickname,
        request.body.lat,
        request.body.lng,
    ];
    pool
        .query(theQuery, values)
        .then((result) => {
            response.status(201).send({
                success: true,
                message: "Location added successfully.",
                location: result.rows[0],
            });
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "Error occurred while adding location.",
                detail: error.detail,
            });
        });
});

/**
 * @api {delete} /location Delete Location
 * @apiName DeleteLocation
 * @apiGroup Location
 *
 * @apiParam {Number} primarykey Primary key of the location.
 *
 * @apiSuccess {Boolean} success Indicates if the location was deleted successfully.
 * @apiSuccess {String} message Success message.
 *
 * @apiUse JSONError
 * @apiError (400: Missing required information) {String} message "Missing required information."
 * @apiError (400: Error Occurred) {String} message "Error occurred while deleting location."
 * @apiError (404: Not Found) {String} message "Location not found."
 */
router.delete("/", async (request, response, next) => {
    if (isNumberProvided(request.body.primarykey)) {
        next();
    } else { // No primary key -> delete all locations
        const theQuery = `DELETE FROM Locations
                      WHERE MemberID = $1`;
        const values = [
            request.decoded.memberid,
        ];
        pool
            .query(theQuery, values)
            .then((result) => {
                response.status(200).send({
                    success: true,
                    message: "All locations deleted successfully.",
                });
            })
            .catch((error) => {
                console.log(error);
                response.status(400).send({
                    message: "Error occurred while deleting all locations.",
                    detail: error.detail,
                });
            });
    }
},
(request, response) => {
    const theQuery = `DELETE FROM Locations
                      WHERE MemberID = $1 AND PrimaryKey = $2`;
    const values = [
        request.decoded.memberid,
        request.body.primarykey,
    ];
    pool
        .query(theQuery, values)
        .then((result) => {
            response.status(200).send({
                success: true,
                message: "Location deleted successfully.",
            });
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "Error occurred while deleting location.",
                detail: error.detail,
            });
        });
});

/**
 * @api {put} /location Update Location
 * @apiName UpdateLocation
 * @apiGroup Location
 *
 * @apiParam {Number} primarykey Primary key of the location.
 * @apiParam {String} nickname Nickname of the location.
 * @apiParam {Number} lat Latitude of the location.
 * @apiParam {Number} lng Longitude of the location.
 *
 * @apiSuccess {Boolean} success Indicates if the location was updated successfully.
 * @apiSuccess {String} message Success message.
 * @apiSuccess {Object} location The updated location object.
 *
 * @apiUse JSONError
 * @apiError (400: Missing required information) {String} message "Missing required information."
 * @apiError (400: Invalid Parameters) {String} message "Location is not valid."
 * @apiError (400: Error Occurred) {String} message "Error occurred while updating location."
 * @apiError (404: Not Found) {String} message "Location not found."
 */
router.put("/", (request, response, next) => {
    if (
        isNumberProvided(request.body.primarykey)
        && isStringProvided(request.body.nickname)
        && isNumberProvided(request.body.lat)
        && isNumberProvided(request.body.lng)
    ) {
        next();
    }
    else {
        response.status(400).send({
            message: "Missing required information.",
        });
    }
},
(request, response, next) => {
    if (isLatLong(`${request.body.lat},${request.body.lng}`)) {
        next();
    } else {
        response.status(400).send({
            message: "Location is not valid.",
        });
    }
},
(request, response) => {
    const theQuery = `UPDATE Locations
                        SET Nickname = $1, Lat = $2, Long = $3
                        WHERE MemberID = $4 AND PrimaryKey = $5
                        RETURNING *`;
    const values = [
        request.body.nickname,
        request.body.lat,
        request.body.lng,
        request.decoded.memberid,
        request.body.primarykey,
    ];
    pool
        .query(theQuery, values)
        .then((result) => {
            if (result.rowCount > 0) {
                response.status(200).send({
                    success: true,
                    message: "Location updated successfully.",
                    location: result.rows[0],
                });
            } else {
                response.status(404).send({
                    message: "Location not found.",
                });
            }
        })
        .catch((error) => {
            console.log(error);
            response.status(400).send({
                message: "Error occurred while updating location.",
                detail: error.detail,
            });
        });
});



module.exports = router;