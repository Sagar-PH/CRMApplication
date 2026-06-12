/**
 * Uniform JSON response helpers.
 * Every handler uses these instead of raw res.send / res.json.
 */

function success(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({ success: true, ...data });
}

function created(res, data = {}) {
    return success(res, data, 201);
}

function notFound(res, message = 'Resource not found') {
    return res.status(404).json({ success: false, message });
}

function badRequest(res, message = 'Bad request') {
    return res.status(400).json({ success: false, message });
}

function unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({ success: false, message });
}

function serverError(res, err) {
    return res.status(500).json({ success: false, message: err?.message || 'Internal server error' });
}

module.exports = { success, created, notFound, badRequest, unauthorized, serverError };
