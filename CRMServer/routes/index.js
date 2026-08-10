const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const authRoutes      = require('./auth');
const resourceRoutes  = require('./resources');
const analyticsRoutes = require('./analytics');
const dashboardRoutes = require('./dashboard');

// Public auth routes (rate-limited internally)
router.use('/auth', authRoutes);

// Everything below requires a valid JWT
router.use(apiLimiter);
router.use(authMiddleware);

router.use('/dashboard',  dashboardRoutes);
router.use('/analytics',  analyticsRoutes);
router.use('/',           resourceRoutes);   // /purchase-orders, /sales-orders, etc.

module.exports = router;
