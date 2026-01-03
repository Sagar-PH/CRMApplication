const express = require('express')
const session = require('express-session')

const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const express_app = express()

let user_collection = undefined;
let user_database = undefined;

express_app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Store Sessions
express_app.use(cors({
    origin: "http://localhost:4200",
    credentials: true
}));

express_app.use(express.json());
express_app.use(express.urlencoded({ extended: true }));


express_app.use(async (req, res, next) => {
    // console.log('Session ID:', req.session.user);
    if (req.session.user) {
        const user_found = await findInCollection(user_collection, {
            UserName: req.session.user['username']
        })

        if (user_found !== null) {
            // console.log('user found:: ', user_found)
            user_database = client.db(user_found['Database'])
        }
    }

    next();
});

const PORT = 8080

const url = "mongodb+srv://sagarph_db_user:Sagar%401701@cluster0.7epy1hb.mongodb.net/?appName=Cluster0";
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const collections = ['Contacts', 'Tasks', 'PurchaseOrders', 'SalesOrders', 'Vendors']

express_app.post('/login', async (req, res) => {
    console.log('login requested..', req.body)

    if (isAuthenticated(req)) {
        return res.send({ type: 'login', status: "Redirect" })
    }

    const user_found = await user_collection.findOne({
        UserName: req.body['username'],
        Password: req.body['password']
    })

    if (user_found) {
        req.session.user = { username: req.body['username'] }
        return res.send({ type: 'login', status: "Success" })
    }

    return res.send({ type: 'login', status: "User not Exist" })

})

express_app.post("/logout", (req, res) => {
    console.log('logout triggered')
    if (!isAuthenticated(req)) {
        res.json({ type: 'logout', status: "no User" });
    }

    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ status: "Failed" });
        }

        res.clearCookie("connect.sid");
        res.json({ type: 'logout', status: "Success" });
    });
});

express_app.get('/auth/check', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
});

express_app.post('/register', async (req, res) => {
    console.log('register requested..', req.body)

    if (isAuthenticated(req)) {
        return res.send({ type: 'register', status: "Redirect" })
    }

    const user_db = req.body['username'] + '_db'

    var user_data = {
        Name: req.body['fullname'],
        UserName: req.body['username'],
        Email: req.body['email'],
        Password: req.body['password'],
        Database: user_db
    }

    let insert_status = await insertToCollection(user_collection, user_data)

    if (insert_status) {
        user_database = client.db(user_db);

        await Promise.all(
            collections.map(name => {
                const col = user_database.collection(name);
                return col.createIndex({ row_id: 1 }, { unique: true });
            })
        );


        return res.send({ type: 'register', status: "Success" })
    }

    return res.send({ type: 'register', status: "Failed" })

})
// ---------------------- PURCHASE ORDERS ----------------------
express_app.post('/purchase_order/create', async (req, res) => {
    const p_order_col = user_database.collection('PurchaseOrders');
    const purchase_row_id = await getNextRowId(p_order_col)

    const purchase_order = {
        row_id: purchase_row_id,
        VendorId: req.body['vendorId'],
        VendorName: req.body['vendorName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        Quantity: req.body['quantity'],
        UnitCost: req.body['unitCost'],
        TotalAmount: req.body['totalAmount']
    };

    const insert_status = await insertToCollection(p_order_col, purchase_order);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/purchase_order/view', async (req, res) => {
    const all_p_orders = await user_database.collection('PurchaseOrders').find().toArray();
    return res.send({ orders_request: all_p_orders });
});

express_app.get('/purchase_order/edit/:id', async (req, res) => {
    const { id } = req.params;
    const purchase_collection = user_database.collection('PurchaseOrders');
    const result = await findInCollection(purchase_collection, { row_id: Number(id) });
    return res.send({ order_found: result });
});

express_app.post('/purchase_order/update', async (req, res) => {
    const purchase_order_collection = user_database.collection('PurchaseOrders');
    const update_id = { row_id: req.body['orderId'] };

    const purchase = {
        VendorId: req.body['vendorId'],
        VendorName: req.body['vendorName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        Quantity: req.body['quantity'],
        UnitCost: req.body['unitCost'],
        TotalAmount: req.body['totalAmount']
    };

    await updateCollection(purchase_order_collection, update_id, purchase);
    return res.send({ order_update: 'success' });
});

// ---------------------- SALES ORDERS ----------------------
express_app.post('/sales_order/create', async (req, res) => {
    const s_order_col = user_database.collection('SalesOrders');
    const sales_row_id = await getNextRowId(s_order_col)

    const sales_order = {
        row_id: sales_row_id,
        AccountId: req.body['accountId'],
        ContactId: req.body['contactId'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        Quantity: req.body['quantity'],
        UnitPrice: req.body['unitPrice'],
        TotalAmount: req.body['totalAmount']
    };

    const insert_status = await insertToCollection(s_order_col, sales_order);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/sales_order/view', async (req, res) => {
    const all_s_orders = await user_database.collection('SalesOrders').find().toArray();
    return res.send({ orders_request: all_s_orders });
});

express_app.get('/sales_order/edit/:id', async (req, res) => {
    const { id } = req.params;
    const sales_collection = user_database.collection('SalesOrders');
    const result = await findInCollection(sales_collection, { row_id: Number(id) });
    return res.send({ order_found: result });
});

express_app.post('/sales_order/update', async (req, res) => {
    const sales_order_collection = user_database.collection('SalesOrders');
    const update_id = { row_id: req.body['orderId'] };

    const sale = {
        AccountId: req.body['accountId'],
        ContactId: req.body['contactId'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        Quantity: req.body['quantity'],
        UnitPrice: req.body['unitPrice'],
        TotalAmount: req.body['totalAmount']
    };

    await updateCollection(sales_order_collection, update_id, sale);
    return res.send({ order_update: 'success' });
});

// ---------------------- VENDORS ----------------------
express_app.post('/vendors/create', async (req, res) => {
    const vendors_col = user_database.collection('Vendors');
    const vendor_row_id = await getNextRowId(vendors_col)

    const vendor = {
        row_id: vendor_row_id,
        VendorName: req.body['vendorName'],
        VendorEmail: req.body['email'],
        VendorPhone: req.body['phone'],
        Website: req.body['website'],
        TaxId: req.body['taxId'],
        PaymentTerms: req.body['paymentTerms'],
        Status: req.body['status']
    };

    const insert_status = await insertToCollection(vendors_col, vendor);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/vendors/view', async (req, res) => {
    const all_vendors = await user_database.collection('Vendors').find().toArray();
    return res.send({ vendors_request: all_vendors });
});

express_app.get('/vendors/edit/:id', async (req, res) => {
    const { id } = req.params;
    const vendors_collection = user_database.collection('Vendors');
    const result = await findInCollection(vendors_collection, { row_id: Number(id) });
    return res.send({ vendor_found: result });
});

express_app.post('/vendors/update', async (req, res) => {
    const vendors_collection = user_database.collection('Vendors');
    const update_id = { row_id: req.body['vendorId'] };

    const vendor = {
        VendorName: req.body['vendorName'],
        VendorEmail: req.body['email'],
        VendorPhone: req.body['phone'],
        Website: req.body['website'],
        TaxId: req.body['taxId'],
        PaymentTerms: req.body['paymentTerms'],
        Status: req.body['status']
    };

    await updateCollection(vendors_collection, update_id, vendor);
    return res.send({ vendor_update: 'success' });
});

// ---------------------- CONTACTS ----------------------
express_app.post('/contacts/create', async (req, res) => {
    const contacts_col = user_database.collection('Contacts');
    const contact_row_id = await getNextRowId(contacts_col)

    const contact = {
        row_id: contact_row_id,
        FirstName: req.body['firstName'],
        LastName: req.body['lastName'],
        Email: req.body['email'],
        Phone: req.body['phone'],
        Mobile: req.body['mobile'],
        Designation: req.body['designation'],
        Department: req.body['department'],
        AccountId: req.body['accountId'],
        Status: req.body['status']
    };

    const insert_status = await insertToCollection(contacts_col, contact);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/contacts/view', async (req, res) => {
    const all_contacts = await user_database.collection('Contacts').find().toArray();
    return res.send({ contacts_request: all_contacts });
});

express_app.get('/contacts/edit/:id', async (req, res) => {
    const { id } = req.params;
    const contacts_collection = user_database.collection('Contacts');
    const result = await findInCollection(contacts_collection, { row_id: Number(id) });
    return res.send({ contact_found: result });
});

express_app.post('/contacts/update', async (req, res) => {
    const contacts_collection = user_database.collection('Contacts');
    const update_id = { row_id: req.body['contactId'] };

    const contact = {
        FirstName: req.body['firstName'],
        LastName: req.body['lastName'],
        Email: req.body['email'],
        Phone: req.body['phone'],
        Mobile: req.body['mobile'],
        Designation: req.body['designation'],
        Department: req.body['department'],
        AccountId: req.body['accountId'],
        Status: req.body['status']
    };

    await updateCollection(contacts_collection, update_id, contact);
    return res.send({ contact_update: 'success' });
});

// ---------------------- TASKS ----------------------
express_app.post('/tasks/create', async (req, res) => {
    const tasks_col = user_database.collection('Tasks');
    const task_row_id = await getNextRowId(tasks_col)

    const task = {
        row_id: task_row_id,
        Subject: req.body['subject'],
        Description: req.body['description'],
        RelatedType: req.body['relatedType'],
        RelatedId: req.body['relatedId'],
        AssignedTo: req.body['assignedTo'],
        Status: req.body['status'],
        DueDate: req.body['dueDate']
    };

    const insert_status = await insertToCollection(tasks_col, task);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/tasks/view', async (req, res) => {
    const all_tasks = await user_database.collection('Tasks').find().toArray();
    return res.send({ tasks_request: all_tasks });
});

express_app.get('/tasks/edit/:id', async (req, res) => {
    const { id } = req.params;
    const tasks_collection = user_database.collection('Tasks');
    const result = await findInCollection(tasks_collection, { row_id: Number(id) });
    return res.send({ task_found: result });
});

express_app.post('/tasks/update', async (req, res) => {
    const task_collection = user_database.collection('Tasks');
    const update_id = { row_id: req.body['taskId'] };

    const task = {
        Subject: req.body['subject'],
        Description: req.body['description'],
        RelatedType: req.body['relatedType'],
        RelatedId: req.body['relatedId'],
        AssignedTo: req.body['assignedTo'],
        Status: req.body['status'],
        DueDate: req.body['dueDate']
    };

    await updateCollection(task_collection, update_id, task);
    return res.send({ task_update: 'success' });
});

express_app.get('/dashboard', async (req, res) => {
    const sales = await user_database.collection('SalesOrders').find().toArray();
    const purchase = await user_database.collection('PurchaseOrders').find().toArray();
    const tasks = await user_database.collection('Tasks').find().toArray();
    const contacts = await user_database.collection('Contacts').find().toArray();
    const vendors = await user_database.collection('Vendors').find().toArray();

    return res.send({ 
        sales: sales,
        purchase: purchase,
        tasks: tasks,
        contacts: contacts,
        vendors: vendors
    });
})

async function connectDB() {
    try {
        await client.connect();
        const db = client.db("CRMAccount");

        // const user_check = await db.listCollections({"name": "users"}).toArray()
        // console.log(List of collection from query:: , user_check.length)

        // await db.createCollection("users");

        // Create if not present, use if present
        user_collection = db.collection('users')
        await user_collection.createIndex({ UserName: 1 }, { unique: true });

        console.log("Connected to MongoDB", db.users);
    } catch (err) {
        console.error(err);
    }
}

async function insertToCollection(db_collection, user_data) {
    try {
        await db_collection.insertOne(user_data)
        console.log('insert success')
        return true
    } catch (err) {
        console.log('insert fail')
        return false
    }
}

async function findInCollection(db_collection, find_query) {
    try {
        const result = await db_collection.findOne(find_query)
        // console.log("Found the data:: ", result)
        return result
    } catch (err) {
        console.log('Querying Failed!', err)
        return null
    }
}

async function updateCollection(udt_collection, update_id, update_data, upsert = false) {
    try {
        const result = await udt_collection.updateOne(
            update_id,
            {
                $set: update_data
            },
            { upsert: upsert }
        )

        console.log("Update Success:: ", result)
    } catch (err) {
        console.log('Querying Failed!', err)
    }
}

async function getNextRowId(collection) {
    try {
        const lastRecord = await collection
            .find({}, { projection: { row_id: 1 } })
            .sort({ row_id: -1 })
            .limit(1)
            .toArray();

        if (lastRecord.length === 0) return 1; // First record
        return lastRecord[0].row_id + 1;
    } catch (error) {
        console.error("Error generating next row_id:", error);
        throw error;
    }
}


function isAuthenticated(request) {
    let user_check = request.session.user
    if (user_check === undefined || user_check === null) {
        return false
    }

    return true
}

express_app.listen(PORT, async () => {
    await connectDB()
    console.log('Listening...', PORT)
})