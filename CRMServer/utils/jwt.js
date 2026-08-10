const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET;

/**
 * @param {object} payload   - Data to embed (keep small: id, username, email)
 * @param {'access'|'refresh'} type
 */
function generateToken(payload, type) {
    const expiresIn = type === 'access'
        ? (process.env.JWT_ACCESS_EXPIRES_IN)
        : (process.env.JWT_REFRESH_EXPIRES_IN);

    return jwt.sign({ ...payload, ttype: type }, SECRET(), { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, SECRET());
}

module.exports = { generateToken, verifyToken };
