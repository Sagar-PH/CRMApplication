const { withCache } = require('../config/cache');
const { success, serverError } = require('../utils/response');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFromDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
}

function getTrendTag(growth) {
    if (growth === null || isNaN(growth)) return 'No Data';
    if (growth >= 10) return 'Rising';
    if (growth <= -10) return 'Falling';
    return 'Stable';
}

function getLastNMonths(n) {
    const result = [];
    const now = new Date();
    now.setDate(1);
    for (let i = 0; i < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
        result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return result;
}

// ─── Core trend computation ────────────────────────────────────────────────────

async function computeCollectionTrend(collection, months) {
    const totalMonths = months * 2;
    const timeline = getLastNMonths(totalMonths);

    const monthlyData = await collection.aggregate([
        {
            $addFields: {
                yearMonth: { $dateToString: { format: '%Y-%m', date: { $toDate: '$OrderDate' } } },
            },
        },
        {
            $group: {
                _id: { productId: '$ProductId', productName: '$ProductName', month: '$yearMonth' },
                units_sold: { $sum: '$Quantity' },
                product_revenue: { $sum: '$TotalAmount' },
            },
        },
        { $sort: { '_id.productId': 1, '_id.month': 1 } },
    ]).toArray();

    const productMap = {};
    for (const row of monthlyData) {
        const pid = row._id.productId;
        if (!productMap[pid]) productMap[pid] = { name: row._id.productName, rows: [] };
        productMap[pid].rows.push(row);
    }

    const result = [];
    for (const pid in productMap) {
        const { name, rows } = productMap[pid];
        const monthMap = {};
        rows.forEach(r => {
            monthMap[r._id.month] = { revenue: r.product_revenue, units: r.units_sold };
        });

        const normalized = timeline.map(m => ({
            month: m,
            revenue: monthMap[m]?.revenue || 0,
            units: monthMap[m]?.units || 0,
        }));

        const prev = normalized.slice(0, months);
        const curr = normalized.slice(months);

        const prevRevenue = prev.reduce((s, m) => s + m.revenue, 0);
        const currRevenue = curr.reduce((s, m) => s + m.revenue, 0);
        const prevUnits   = prev.reduce((s, m) => s + m.units, 0);
        const currUnits   = curr.reduce((s, m) => s + m.units, 0);

        const revenueGrowth = prevRevenue ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : null;
        const unitGrowth    = prevUnits   ? ((currUnits   - prevUnits)   / prevUnits)   * 100 : null;

        result.push({
            productId: pid,
            productName: name,
            previousRevenue,
            currentRevenue: currRevenue,
            revenueGrowthPct: revenueGrowth?.toFixed(2) ?? null,
            revenueTrend: getTrendTag(revenueGrowth),
            previousUnits: prevUnits,
            currentUnits: currUnits,
            unitGrowthPct: unitGrowth?.toFixed(2) ?? null,
            unitTrend: getTrendTag(unitGrowth),
            timeline: normalized,
        });
    }
    return result;
}

// ─── Exported route handlers ──────────────────────────────────────────────────

async function salesTrends(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 1));
        const key = `cache:${req.userDB.databaseName}:analytics:salesTrends:${months}`;
        const data = await withCache(key, () =>
            computeCollectionTrend(req.userDB.collection('SalesOrders'), months)
        );
        return success(res, { data });
    } catch (err) {
        logger.error('salesTrends error:', err);
        return serverError(res, err);
    }
}

async function purchaseTrends(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 1));
        const key = `cache:${req.userDB.databaseName}:analytics:purchaseTrends:${months}`;
        const data = await withCache(key, () =>
            computeCollectionTrend(req.userDB.collection('PurchaseOrders'), months)
        );
        return success(res, { data });
    } catch (err) {
        logger.error('purchaseTrends error:', err);
        return serverError(res, err);
    }
}

async function topProducts(req, res) {
    try {
        const limit = Math.min(parseInt(req.query.limit || 10), 50);
        const key = `cache:${req.userDB.databaseName}:analytics:topProducts:${limit}`;
        const data = await withCache(key, async () => {
            return req.userDB.collection('SalesOrders').aggregate([
                {
                    $group: {
                        _id: '$ProductId',
                        productName: { $first: '$ProductName' },
                        totalRevenue: { $sum: '$TotalAmount' },
                        totalUnits: { $sum: '$Quantity' },
                    },
                },
                { $sort: { totalRevenue: -1 } },
                { $limit: limit },
            ]).toArray();
        });
        return success(res, { data });
    } catch (err) {
        logger.error('topProducts error:', err);
        return serverError(res, err);
    }
}

async function salesVsPurchase(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 6));
        const key = `cache:${req.userDB.databaseName}:analytics:salesVsPurchase:${months}`;
        const data = await withCache(key, async () => {
            const timeline = getLastNMonths(months);
            const dateFilter = { $gte: getFromDate(months).toISOString() };

            const [salesData, purchaseData] = await Promise.all([
                req.userDB.collection('SalesOrders').aggregate([
                    { $match: { OrderDate: dateFilter } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m', date: { $toDate: '$OrderDate' } } }, revenue: { $sum: '$TotalAmount' } } },
                ]).toArray(),
                req.userDB.collection('PurchaseOrders').aggregate([
                    { $match: { OrderDate: dateFilter } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m', date: { $toDate: '$OrderDate' } } }, cost: { $sum: '$TotalAmount' } } },
                ]).toArray(),
            ]);

            const salesMap = Object.fromEntries(salesData.map(s => [s._id, s.revenue]));
            const purchaseMap = Object.fromEntries(purchaseData.map(p => [p._id, p.cost]));

            return timeline.map(month => ({
                month,
                sales: salesMap[month] || 0,
                purchases: purchaseMap[month] || 0,
                profit: (salesMap[month] || 0) - (purchaseMap[month] || 0),
            }));
        });
        return success(res, { data });
    } catch (err) {
        logger.error('salesVsPurchase error:', err);
        return serverError(res, err);
    }
}

async function salesForecast(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 3));
        const key = `cache:${req.userDB.databaseName}:analytics:forecast:${months}`;
        const data = await withCache(key, async () => {
            const fromDate = getFromDate(months);
            const sales = await req.userDB.collection('SalesOrders').aggregate([
                { $addFields: { orderDateObj: { $toDate: '$OrderDate' }, yearMonth: { $dateToString: { format: '%Y-%m', date: { $toDate: '$OrderDate' } } } } },
                { $match: { orderDateObj: { $gte: fromDate } } },
                { $group: { _id: { productId: '$ProductId', productName: '$ProductName', month: '$yearMonth' }, monthly_revenue: { $sum: '$TotalAmount' } } },
                { $sort: { '_id.productId': 1, '_id.month': -1 } },
            ]).toArray();

            const productMap = {};
            for (const row of sales) {
                const pid = row._id.productId;
                if (!productMap[pid]) productMap[pid] = { productName: row._id.productName, revenues: [] };
                productMap[pid].revenues.push(row.monthly_revenue);
            }

            return Object.entries(productMap).map(([pid, { productName, revenues }]) => {
                const recent = revenues.slice(0, months);
                const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
                const confidence = recent.length >= months ? 'High' : recent.length >= Math.ceil(months / 2) ? 'Medium' : 'Low';
                return { productId: pid, productName, monthsUsed: recent.length, forecastRevenue: avg.toFixed(2), confidence };
            });
        });
        return success(res, { data });
    } catch (err) {
        logger.error('salesForecast error:', err);
        return serverError(res, err);
    }
}

async function inventoryRisk(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 3));
        const key = `cache:${req.userDB.databaseName}:analytics:inventoryRisk:${months}`;
        const data = await withCache(key, async () => {
            const fromDate = getFromDate(months);
            const matchStage = { $match: { orderDateObj: { $gte: fromDate } } };
            const addDate = { $addFields: { orderDateObj: { $toDate: '$OrderDate' } } };

            const [sales, purchases, products] = await Promise.all([
                req.userDB.collection('SalesOrders').aggregate([addDate, matchStage, { $group: { _id: '$ProductId', productName: { $first: '$ProductName' }, sold_units: { $sum: '$Quantity' } } }]).toArray(),
                req.userDB.collection('PurchaseOrders').aggregate([addDate, matchStage, { $group: { _id: '$ProductId', purchased_units: { $sum: '$Quantity' } } }]).toArray(),
                req.userDB.collection('Products').find({}, { projection: { Name: 1, Stock: 1 } }).toArray(),
            ]);

            const salesMap = Object.fromEntries(sales.map(s => [s._id, s.sold_units]));
            const purchaseMap = Object.fromEntries(purchases.map(p => [p._id, p.purchased_units]));

            return products.map(p => {
                const sold = salesMap[String(p._id)] || 0;
                const purchased = purchaseMap[String(p._id)] || 0;
                const sv = sold / months;
                const pv = purchased / months;
                let risk = 'Stable';
                if (sv > pv && p.Stock <= sv) risk = 'Stockout Risk';
                else if (pv > sv && p.Stock > purchased) risk = 'Overstock Risk';
                else if (sold === 0 && p.Stock > 0) risk = 'Dead Stock';
                return { productId: p._id, productName: p.Name, currentStock: p.Stock, soldUnits: sold, purchasedUnits: purchased, inventoryStatus: risk };
            });
        });
        return success(res, { data });
    } catch (err) {
        logger.error('inventoryRisk error:', err);
        return serverError(res, err);
    }
}

async function reorderSuggestions(req, res) {
    try {
        const months = Math.max(1, parseInt(req.query.months || 3));
        const leadTime = Math.max(1, parseInt(req.query.leadTime || 1));
        const key = `cache:${req.userDB.databaseName}:analytics:reorder:${months}:${leadTime}`;
        const data = await withCache(key, async () => {
            const fromDate = getFromDate(months);
            const addDate = { $addFields: { orderDateObj: { $toDate: '$OrderDate' } } };
            const matchStage = { $match: { orderDateObj: { $gte: fromDate } } };

            const [sales, purchases] = await Promise.all([
                req.userDB.collection('SalesOrders').aggregate([addDate, matchStage, { $group: { _id: '$ProductId', productName: { $first: '$ProductName' }, sold_units: { $sum: '$Quantity' } } }]).toArray(),
                req.userDB.collection('PurchaseOrders').aggregate([addDate, matchStage, { $group: { _id: '$ProductId', purchased_units: { $sum: '$Quantity' } } }]).toArray(),
            ]);

            const purchaseMap = Object.fromEntries(purchases.map(p => [p._id, p.purchased_units]));

            return sales.map(s => {
                const purchased = purchaseMap[s._id] || 0;
                const reorderQty = Math.max(Math.round(((s.sold_units / months) - (purchased / months)) * leadTime), 0);
                return {
                    productId: s._id,
                    productName: s.productName,
                    recommendedQty: reorderQty,
                    reason: reorderQty > 0 ? 'Sales velocity exceeds purchase velocity' : 'Inventory sufficient',
                };
            });
        });
        return success(res, { data });
    } catch (err) {
        logger.error('reorderSuggestions error:', err);
        return serverError(res, err);
    }
}

module.exports = { salesTrends, purchaseTrends, topProducts, salesVsPurchase, salesForecast, inventoryRisk, reorderSuggestions };
