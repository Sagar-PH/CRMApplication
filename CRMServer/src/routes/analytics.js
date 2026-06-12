const router = require('express').Router();
const {
    salesTrends,
    purchaseTrends,
    topProducts,
    salesVsPurchase,
    salesForecast,
    inventoryRisk,
    reorderSuggestions,
} = require('../services/analyticsService');

router.get('/sales-trends',      salesTrends);
router.get('/purchase-trends',   purchaseTrends);
router.get('/top-products',      topProducts);
router.get('/sales-vs-purchase', salesVsPurchase);
router.get('/forecast',          salesForecast);
router.get('/inventory-risk',    inventoryRisk);
router.get('/reorder',           reorderSuggestions);

module.exports = router;
