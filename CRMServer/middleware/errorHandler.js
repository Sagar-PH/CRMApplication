const logger = require('../utils/logger');

function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    logger.error(err);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}

module.exports = { notFoundHandler, errorHandler };
