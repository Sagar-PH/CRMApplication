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

express_app.post('/purchase_order/create', async (req, res) => {
    const p_order_col = user_database.collection('PurchaseOrders')

    var purchase_order = {
        row_id: req.body['orderid'],
        SupplierId: req.body['supplierid'],
        SupplierName: req.body['suppliername'],
        Date: req.body['date'],
        Currency: req.body['currency']
    }

    let insert_status = await insertToCollection(p_order_col, purchase_order)

    if (insert_status) {
        return res.send({ 'status': 'inserted' })
    }

    return res.send({ 'status': 'insert failed' })
})

express_app.get('/purchase_order/view', async (req, res) => {
    const all_p_orders = await user_database.collection('PurchaseOrders').find().toArray()
    return res.send({ 'orders_request': all_p_orders })
})

express_app.get('/purchase_order/edit/:id', async (req, res) => {
    const { id } = req.params;

    const purchase_collection = await user_database.collection('PurchaseOrders')
    const result = await findInCollection(purchase_collection, { row_id: id })
    return res.send({ 'order_found': result })
})

express_app.post('/purchase_order/update', async (req, res) =>{
    const purchase_order_collection = user_database.collection('PurchaseOrders')
    const update_id = {row_id: req.body['orderid']}

    var purchase = {
        SupplierId: req.body['supplierid'],
        SupplierName: req.body['suppliername'],
        Date: req.body['date'],
        Currency: req.body['currency']
    }

    await updateCollection(purchase_order_collection, update_id, purchase)
    return res.send({'order_update': 'success'})
})

express_app.post('/sales_order/create', async (req, res) => {
    const s_order_col = user_database.collection('SalesOrders')

    var sales_order = {
        row_id: req.body['orderid'],
        VendorId: req.body['vendorid'],
        VendorName: req.body['vendorname'],
        Date: req.body['date'],
        Currency: req.body['currency']
    }

    let insert_status = await insertToCollection(s_order_col, sales_order)

    if (insert_status) {
        return res.send({ 'status': 'inserted' })
    }

    return res.send({ 'status': 'insert failed' })
})

express_app.get('/sales_order/view', async (req, res) => {
    const all_s_orders = await user_database.collection('SalesOrders').find().toArray()
    return res.send({ 'orders_request': all_s_orders })
})

express_app.get('/sales_order/edit/:id', async (req, res) => {
    const { id } = req.params;

    const sales_collection = await user_database.collection('SalesOrders')
    const result = await findInCollection(sales_collection, { row_id: id })
    return res.send({ 'order_found': result })
})

express_app.post('/Sales_order/update', async (req, res) =>{
    const sales_order_collection = user_database.collection('SalesOrders')
    const update_id = {row_id: req.body['orderid']}

    var sale = {
        VendorId: req.body['vendorid'],
        VendorName: req.body['vendorname'],
        Date: req.body['date'],
        Currency: req.body['currency']
    }

    await updateCollection(sales_order_collection, update_id, sale)
    return res.send({'order_update': 'success'})
})

express_app.post('/vendors/create', async (req, res) => {
    const vendors_col = user_database.collection('Vendors')

    var vendor = {
        row_id: req.body['vendorid'],
        VendorName: req.body['vendorname'],
        VendorEmail: req.body['vendoremail'],
        VendorPhone: req.body['vendorphone'],
        Category: req.body['category'],
        Status: req.body['status'],
        Website: req.body['website']
    }

    let insert_status = await insertToCollection(vendors_col, vendor)

    if (insert_status) {
        return res.send({ 'status': 'inserted' })
    }

    return res.send({ 'status': 'insert failed' })
})

express_app.get('/vendors/view', async (req, res) => {
    const all_vendors = await user_database.collection('Vendors').find().toArray()
    return res.send({ 'orders_request': all_vendors })
})

express_app.get('/vendors/edit/:id', async (req, res) => {
    const { id } = req.params;

    const vendors_collection = user_database.collection('Vendors')
    const result = await findInCollection(vendors_collection, { row_id: id })
    return res.send({ 'order_found': result })
})


express_app.post('/vendors/update', async (req, res) =>{
    const vendors_collection = user_database.collection('Vendors')
    const update_id = {row_id: req.body['vendorid']}

    var vendor = {
        VendorName: req.body['vendorname'],
        VendorEmail: req.body['vendoremail'],
        VendorPhone: req.body['vendorphone'],
        Category: req.body['category'],
        Status: req.body['status'],
        Website: req.body['website']
    }

    await updateCollection(vendors_collection, update_id, vendor)
    return res.send({'order_update': 'success'})
})

express_app.post('/contacts/create', async (req, res) => {
    const contacts_col = user_database.collection('Contacts')

    var contact = {
        row_id: req.body['contactid'],
        FirstName: req.body['firstname'],
        LastName: req.body['lastname'],
        ContactType: req.body['contacttype'],
        Status: req.body['status'],
        Phone: req.body['phone'],
        Website: req.body['website']
    }

    let insert_status = await insertToCollection(contacts_col, contact)

    if (insert_status) {
        return res.send({ 'status': 'inserted' })
    }

    return res.send({ 'status': 'insert failed' })
})

express_app.get('/contacts/view', async (req, res) => {
    const all_contacts = await user_database.collection('Contacts').find().toArray()
    return res.send({ 'orders_request': all_contacts })
})

express_app.get('/contacts/edit/:id', async (req, res) => {
    const { id } = req.params;

    const contacts_collection = await user_database.collection('Contacts')
    const result = await findInCollection(contacts_collection, { row_id: id })
    return res.send({ 'order_found': result })
})

express_app.post('/contacts/update', async (req, res) =>{
    const contacts_collection = user_database.collection('Contacts')
    const update_id = {row_id: req.body['contactid']}

    var contact = {
        FirstName: req.body['firstname'],
        LastName: req.body['lastname'],
        ContactType: req.body['contacttype'],
        Status: req.body['status'],
        Phone: req.body['phone'],
        Website: req.body['website']
    }

    await updateCollection(contacts_collection, update_id, contact)
    return res.send({'order_update': 'success'})
})


express_app.post('/tasks/create', async (req, res) => {
    const tasks_col = user_database.collection('Tasks')

    var task = {
        row_id: req.body['taskid'],
        Description: req.body['description'],
        Status: req.body['status'],
        Component: req.body['component'],
        Priority: req.body['priority'],
        AssignedTo: req.body['assignedto'],
        CreateBy: req.body['createdby'],
        StartDate: req.body['startdate']
    }

    let insert_status = await insertToCollection(tasks_col, task)

    if (insert_status) {
        return res.send({ 'status': 'inserted' })
    }

    return res.send({ 'status': 'insert failed' })
})

express_app.get('/tasks/view', async (req, res) => {
    const all_tasks = await user_database.collection('Tasks').find().toArray()
    return res.send({ 'orders_request': all_tasks })
})

express_app.get('/tasks/edit/:id', async (req, res) => {
    const { id } = req.params;

    const tasks_collection = await user_database.collection('Tasks')
    const result = await findInCollection(tasks_collection, { row_id: id })
    return res.send({ 'order_found': result })
})

express_app.post('/tasks/update', async (req, res) =>{
    const task_collection = user_database.collection('Tasks')
    const update_id = { row_id: req.body['taskid'] }

    var task = {
        Description: req.body['description'],
        Status: req.body['status'],
        Component: req.body['component'],
        Priority: req.body['priority'],
        AssignedTo: req.body['assignedto'],
        CreateBy: req.body['createdby'],
        StartDate: req.body['startdate']
    }

    await updateCollection(task_collection, update_id, task)
    return res.send({'order_update': 'success'})
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