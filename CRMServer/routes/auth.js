const router = require('express').Router();
const {
    login, register, refresh, logout, googleAuth, googleCallback, checkAuth,
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Password auth
router.post('/login',    authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/refresh',  refresh);
router.post('/logout',   logout);

// JWT-protected check
router.get('/check', authMiddleware, checkAuth);

// Google OAuth
router.get('/google',          googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;
