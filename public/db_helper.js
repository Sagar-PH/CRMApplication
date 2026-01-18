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

            // Step 1: Monthly aggregation
            const monthlyData = await sales_collection.aggregate([
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

            // Step 3: Period-over-period comparison
            const result = [];

            for (const pid in productMap) {
                const history = productMap[pid];

                // Need at least 2 * N months
                if (history.length < months * 2) continue;

                const currentPeriod = history.slice(-months);
                const previousPeriod = history.slice(-months * 2, -months);

                const currentRevenue = currentPeriod.reduce(
                    (sum, m) => sum + m.product_revenue, 0
                );
                const previousRevenue = previousPeriod.reduce(
                    (sum, m) => sum + m.product_revenue, 0
                );

                const currentUnits = currentPeriod.reduce(
                    (sum, m) => sum + m.units_sold, 0
                );
                const previousUnits = previousPeriod.reduce(
                    (sum, m) => sum + m.units_sold, 0
                );

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
                    period_months: months,
                    current_period: {
                        from: currentPeriod[0]._id.month,
                        to: currentPeriod[currentPeriod.length - 1]._id.month,
                        revenue: currentRevenue,
                        units: currentUnits
                    },
                    previous_period: {
                        from: previousPeriod[0]._id.month,
                        to: previousPeriod[previousPeriod.length - 1]._id.month,
                        revenue: previousRevenue,
                        units: previousUnits
                    },
                    revenue_trend: this.getTrendTag(revenueGrowth),
                    units_trend: this.getTrendTag(unitsGrowth),
                    revenue_growth: revenueGrowth !== null ? revenueGrowth.toFixed(2) : null,
                    units_growth: unitsGrowth !== null ? unitsGrowth.toFixed(2) : null
                });
            }

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }

    }

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
                    productMap[pid] = [];
                }

                productMap[pid].push(row.monthly_revenue);
            }

            // 3. Forecast per product
            const result = Object.keys(productMap).map(pid => {
                const revenues = productMap[pid].slice(0, months);
                const total = revenues.reduce((a, b) => a + b, 0);
                const avg = revenues.length ? total / revenues.length : 0;

                let confidence = "Low";
                if (revenues.length >= months) confidence = "High";
                else if (revenues.length >= Math.ceil(months / 2)) confidence = "Medium";

                return {
                    productId: pid,
                    months_used: revenues.length,
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
                        purchased_units: { $sum: "$Quantity" }
                    }
                }
            ]).toArray();

            // 3. Product stock (ALL products)
            const products = await db.collection("Products").find(
                {},
                { projection: { name: 1, current_stock: 1 } }
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
                    product_name: p.name,
                    current_stock: p.current_stock,
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
