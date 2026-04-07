class DBHelper {

    static async connectDB(client) {
        try {
            await client.connect();
            const db = client.db("CRMAccount");

            const userCollection = db.collection("users");

            // Ensure unique username
            await userCollection.createIndex(
                { UserName: 1 },
                { unique: true }
            );

            console.log("Connected to MongoDB: CRMAccount");

            return userCollection;
        } catch (err) {
            console.error("DB connection failed:", err);
            return null;
        }
    }

    static async insertToCollection(collection, data) {
        try {
            await collection.insertOne(data);
            console.log("Insert success");
            return true;
        } catch (err) {
            console.error("Insert failed:", err);
            return false;
        }
    }

    static async findInCollection(collection, query) {
        try {
            return await collection.findOne(query);
        } catch (err) {
            console.error("Query failed:", err);
            return null;
        }
    }

    static async updateCollection(
        collection,
        filter,
        updateData,
        upsert = false
    ) {
        try {
            const result = await collection.updateOne(
                filter,
                { $set: updateData },
                { upsert }
            );

            console.log("Update success:", result.modifiedCount);
            return result;
        } catch (err) {
            console.error("Update failed:", err);
            return null;
        }
    }

    static async getNextRowId(collection) {
        try {
            const lastRecord = await collection
                .find({}, { projection: { row_id: 1 } })
                .sort({ row_id: -1 })
                .limit(1)
                .toArray();

            return lastRecord.length === 0
                ? 1
                : lastRecord[0].row_id + 1;
        } catch (error) {
            console.error("Error generating next row_id:", error);
            throw error;
        }
    }

    static isAuthenticated(request) {
        return !!request.session?.user;
    }

    static getTrendTag(growth, positiveThreshold = 10, negativeThreshold = -10) {
        if (growth === null || isNaN(growth)) return "No Data";
        if (growth >= positiveThreshold) return "Rising";
        if (growth <= negativeThreshold) return "Falling";
        return "Stable";
    }

    static getFromDate(months) {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
        return date;
    }

    static salesTrends = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 1);

            const sales_collection = await db.collection('SalesOrders');
            const result = await this.get_collection_trend(sales_collection, months)

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }

    }

    static purchaseTrends = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 1);

            const purchases_collection = await db.collection('PurchaseOrders');
            const result = await this.get_collection_trend(purchases_collection, months)

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }

    }

    static getLastNMonths(n) {
        const result = [];
        const now = new Date();
        now.setDate(1); // normalize

        for (let i = 0; i < n; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            result.push(`${year}-${month}`);
        }

        return result;
    }


    static get_collection_trend = async (trend_check_collection, months) => {

        // Step 1: Monthly aggregation
        const monthlyData = await trend_check_collection.aggregate([
            {
                $addFields: {
                    orderDateObj: { $toDate: "$OrderDate" },
                    yearMonth: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: { $toDate: "$OrderDate" }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        productId: "$ProductId",
                        productName: "$ProductName",
                        month: "$yearMonth"
                    },
                    units_sold: { $sum: "$Quantity" },
                    product_revenue: { $sum: "$TotalAmount" }
                }
            },
            {
                $sort: {
                    "_id.productId": 1,
                    "_id.month": 1
                }
            }
        ]).toArray();

        // Step 2: Group by product
        const productMap = {};
        for (const row of monthlyData) {
            const pid = row._id.productId;
            if (!productMap[pid]) productMap[pid] = [];
            productMap[pid].push(row);
        }

        // Step 3: Normalize timeline & compare periods
        const result = [];
        const totalMonths = months * 2;
        const timeline = this.getLastNMonths(totalMonths);
        // console.log('TIMELINE:: ', timeline)

        for (const pid in productMap) {
            const history = productMap[pid];

            // Map month -> values
            const monthMap = {};
            for (const row of history) {
                monthMap[row._id.month] = {
                    revenue: row.product_revenue,
                    units: row.units_sold
                };
            }

            // Fill missing months with zero
            const normalized = timeline.map(m => ({
                month: m,
                revenue: monthMap[m]?.revenue || 0,
                units: monthMap[m]?.units || 0
            }));

            const previousPeriod = normalized.slice(0, months);
            const currentPeriod = normalized.slice(months);

            const previousRevenue = previousPeriod.reduce((s, m) => s + m.revenue, 0);
            const currentRevenue = currentPeriod.reduce((s, m) => s + m.revenue, 0);

            const previousUnits = previousPeriod.reduce((s, m) => s + m.units, 0);
            const currentUnits = currentPeriod.reduce((s, m) => s + m.units, 0);

            const revenueGrowth =
                previousRevenue > 0
                    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
                    : null;

            const unitsGrowth =
                previousUnits > 0
                    ? ((currentUnits - previousUnits) / previousUnits) * 100
                    : null;

            result.push({
                productId: pid,
                productName: history[0]._id.productName,
                period_months: months,

                current_period: {
                    from: currentPeriod[0].month,
                    to: currentPeriod[currentPeriod.length - 1].month,
                    revenue: currentRevenue, // ✅ 0 if no sales
                    units: currentUnits
                },

                previous_period: {
                    from: previousPeriod[0].month,
                    to: previousPeriod[previousPeriod.length - 1].month,
                    revenue: previousRevenue,
                    units: previousUnits
                },

                revenue_trend: this.getTrendTag(revenueGrowth),
                units_trend: this.getTrendTag(unitsGrowth),

                revenue_growth: revenueGrowth !== null ? revenueGrowth.toFixed(2) : null,
                units_growth: unitsGrowth !== null ? unitsGrowth.toFixed(2) : null
            });
        }

        return result;
    };

    static topProducts = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 3);
            const by = req.query.by || "revenue";

            const fromDate = this.getFromDate(months);

            const sortField =
                by === "units" ? { units_sold: -1 } : { product_revenue: -1 };

            const data = await db.collection("SalesOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        units_sold: { $sum: "$Quantity" },
                        product_revenue: { $sum: "$TotalAmount" }
                    }
                },
                { $sort: sortField },
                { $limit: 10 }
            ]).toArray();

            res.json(data);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static salesVsPurchase = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 3);
            const fromDate = this.getFromDate(months);

            const sales = await db.collection("SalesOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        sold_units: { $sum: "$Quantity" },
                        revenue: { $sum: "$TotalAmount" }
                    }
                }
            ]).toArray();

            const purchases = await db.collection("PurchaseOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        purchased_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            const purchaseMap = {};
            purchases.forEach(p => purchaseMap[p._id] = p.purchased_units);

            const result = sales.map(s => {
                const purchased = purchaseMap[s._id] || 0;

                let status = "Balanced";
                if (s.sold_units > purchased) status = "Demand Exceeds Supply";
                else if (purchased > s.sold_units) status = "Oversupply";

                return {
                    productId: s._id,
                    productName: s.productName,
                    sold_units: s.sold_units,
                    purchased_units: purchased,
                    revenue: s.revenue,
                    status
                };
            });

            res.json(result);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }


    static salesForecast = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 3);
            const fromDate = this.getFromDate(months);

            // 1. Aggregate monthly revenue per product
            const sales = await db.collection("SalesOrders").aggregate([
                {
                    $addFields: {
                        orderDateObj: { $toDate: "$OrderDate" },
                        yearMonth: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: { $toDate: "$OrderDate" }
                            }
                        }
                    }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: {
                            productId: "$ProductId",
                            productName: "$ProductName",
                            month: "$yearMonth"
                        },
                        monthly_revenue: { $sum: "$TotalAmount" }
                    }
                },
                { $sort: { "_id.productId": 1, "_id.month": -1 } }
            ]).toArray();

            // 2. Group months per product
            const productMap = {};

            for (const row of sales) {
                const pid = row._id.productId;

                if (!productMap[pid]) {
                    productMap[pid] = {
                        productName: row._id.productName,
                        revenues: []
                    };
                }

                productMap[pid].revenues.push(row.monthly_revenue);
            }

            const result = Object.keys(productMap).map(pid => {
                const { productName, revenues } = productMap[pid];

                const recentRevenues = revenues.slice(0, months);
                const total = recentRevenues.reduce((a, b) => a + b, 0);
                const avg = recentRevenues.length ? total / recentRevenues.length : 0;

                let confidence = "Low";
                if (recentRevenues.length >= months) confidence = "High";
                else if (recentRevenues.length >= Math.ceil(months / 2)) confidence = "Medium";

                return {
                    productId: pid,
                    productName,                 // ✅ fixed
                    months_used: recentRevenues.length,
                    forecast_revenue: avg.toFixed(2),
                    confidence
                };
            });


            res.json(result);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };


    static inventoryRisk = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 3);
            const fromDate = this.getFromDate(months);

            // 1. Sales aggregation (ALL products)
            const sales = await db.collection("SalesOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        sold_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            // 2. Purchase aggregation (ALL products)
            const purchases = await db.collection("PurchaseOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        purchased_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            // 3. Product stock (ALL products)
            const products = await db.collection("Products").find(
                {}, { projection: { Name: 1, Stock: 1 } }
            ).toArray();

            // Maps for fast lookup
            const salesMap = {};
            sales.forEach(s => salesMap[s._id] = s.sold_units);

            const purchaseMap = {};
            purchases.forEach(p => purchaseMap[p._id] = p.purchased_units);

            // 4. Risk analysis per product
            const result = products.map(p => {
                const sold = salesMap[p._id] || 0;
                const purchased = purchaseMap[p._id] || 0;

                const salesVelocity = sold / months;
                const purchaseVelocity = purchased / months;

                let risk = "Stable";

                if (salesVelocity > purchaseVelocity && p.current_stock <= salesVelocity) {
                    risk = "Stockout Risk";
                }
                else if (purchaseVelocity > salesVelocity && p.current_stock > purchased) {
                    risk = "Overstock Risk";
                }
                else if (sold === 0 && p.current_stock > 0) {
                    risk = "Dead Stock";
                }

                return {
                    productId: p._id,
                    product_name: p.Name,
                    current_stock: p.Stock,
                    sold_units: sold,
                    purchased_units: purchased,
                    inventory_status: risk
                };
            });

            res.json(result);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };


    static reorderSuggestions = async (req, res) => {
        try {
            const db = req.user_database;
            const months = parseInt(req.query.months || 3);
            const leadTime = parseInt(req.query.leadTime || 1);
            const fromDate = this.getFromDate(months);

            const sales = await db.collection("SalesOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        sold_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            const purchases = await db.collection("PurchaseOrders").aggregate([
                {
                    $addFields: { orderDateObj: { $toDate: "$OrderDate" } }
                },
                { $match: { orderDateObj: { $gte: fromDate } } },
                {
                    $group: {
                        _id: "$ProductId",
                        productName: { $first: "$ProductName" },
                        purchased_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            const purchaseMap = {};
            purchases.forEach(p => purchaseMap[p._id] = p.purchased_units);

            const result = sales.map(s => {
                const purchased = purchaseMap[s._id] || 0;
                const salesVelocity = s.sold_units / months;
                const purchaseVelocity = purchased / months;

                const reorderQty = Math.max(
                    Math.round((salesVelocity - purchaseVelocity) * leadTime),
                    0
                );

                return {
                    productId: s._id,
                    productName: s.productName,
                    recommended_qty: reorderQty,
                    reason:
                        reorderQty > 0
                            ? "Sales velocity exceeds purchase velocity"
                            : "Inventory sufficient"
                };
            });

            res.json(result);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = DBHelper;
