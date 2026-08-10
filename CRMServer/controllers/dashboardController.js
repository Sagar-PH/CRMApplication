const { withCache } = require('../config/cache');
const { success, serverError } = require('../utils/response');
const logger = require('../utils/logger');

async function getDashboard(req, res) {
    try {
        const key = `cache:${req.userDB.databaseName}:dashboard`;
        const data = await withCache(key, async () => {
            const [sales, purchase, tasks, contacts, vendors, products, customers] = await Promise.all([
                req.userDB.collection('SalesOrders').find().toArray(),
                req.userDB.collection('PurchaseOrders').find().toArray(),
                req.userDB.collection('Tasks').find().toArray(),
                req.userDB.collection('Contacts').find().toArray(),
                req.userDB.collection('Vendors').find().toArray(),
                req.userDB.collection('Products').find().toArray(),
                req.userDB.collection('Customers').find().toArray(),
            ]);
            return { sales, purchase, tasks, contacts, vendors, products, customers };
        }, 60); // shorter TTL for dashboard

        return success(res, data);
    } catch (err) {
        logger.error('Dashboard error:', err);
        return serverError(res, err);
    }
}

module.exports = { getDashboard };
