const { verifyToken } = require('../utils/jwt');
const { getUserCollection, getUserDB } = require('../config/database');
const { unauthorized, serverError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verifies the Bearer JWT in Authorization header.
 * On success, attaches req.user (token payload) and req.userDB (user's Mongo DB).
 */
async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = verifyToken(token);

        if (payload.ttype !== 'access') {
            return unauthorized(res, 'Invalid token type');
        }

        // Attach decoded payload
        req.user = payload;

        // Resolve user record to get their database name
        const userCollection = getUserCollection();
        const userRecord = await userCollection.findOne(
            { $or: [{ UserName: payload.username }, { Email: payload.email }] },
            { projection: { Database: 1 } }
        );

        if (!userRecord) return unauthorized(res, 'User not found');

        req.userDB = await getUserDB(userRecord.Database);
        next();
    } catch (err) {
        logger.warn(`Auth failed: ${err.message}`);
        if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired');
        if (err.name === 'JsonWebTokenError') return unauthorized(res, 'Invalid token');
        return serverError(res, err);
    }
}

module.exports = { authMiddleware };
