module.exports = {
    /**
     * Middleware function that checks for and responds to improperly formed
     * JSON in request parameters. If none are found, it passes simply passes
     * control to the next middleware in the chain.
     * @param {Error} err The error object to check.
     * @param {Object} request The incoming request object.
     * @param {Object} response The outgoing response object.
     * @param {Function} next The next middleware function in the chain.
     */
    jsonErrorInBody: (err, request, response, next) => {
        if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
            response.status(400).send({ message: "malformed JSON in parameters" });
        } else {
            next();
        }
    },
}