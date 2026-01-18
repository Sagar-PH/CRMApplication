const hp = require("./db_helper");

const express = require('express')
const session = require('express-session')

const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const express_app = express()

let user_collection = undefined;

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
        const user_found = await hp.findInCollection(user_collection, {
            UserName: req.session.user['username']
        })

        if (user_found !== null) {
            // console.log('user found:: ', user_found)
            req.user_database = client.db(user_found['Database'])
        }
    }

    next();
});

const PORT = 8080

const url = "mongodb+srv://sagarph_db_user:sagarph%40db@cluster0.7epy1hb.mongodb.net/?appName=Cluster0";
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const collections = ['Contacts', 'Tasks', 'PurchaseOrders', 'SalesOrders', 'Vendors', 'Products']

express_app.post('/login', async (req, res) => {
    console.log('login requested..', req.body)

    if (hp.isAuthenticated(req)) {
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
    if (!hp.isAuthenticated(req)) {
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

    if (hp.isAuthenticated(req)) {
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

    let insert_status = await hp.insertToCollection(user_collection, user_data)

    if (insert_status) {
        req.user_database = client.db(user_db);

        await Promise.all(
            collections.map(name => {
                const col = req.user_database.collection(name);
                return col.createIndex({ row_id: 1 }, { unique: true });
            })
        );


        return res.send({ type: 'register', status: "Success" })
    }

    return res.send({ type: 'register', status: "Failed" })

})
// ---------------------- PURCHASE ORDERS ----------------------
express_app.post('/purchase_order/create', async (req, res) => {
    const p_order_col = req.user_database.collection('PurchaseOrders');
    const purchase_row_id = await hp.getNextRowId(p_order_col)

    const purchase_order = {
        row_id: purchase_row_id,
        VendorId: req.body['vendorId'],
        VendorName: req.body['vendorName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        ProductName: req.body['productName'],
        Quantity: req.body['quantity'],
        TotalAmount: req.body['totalAmount']
    };

    const insert_status = await hp.insertToCollection(p_order_col, purchase_order);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/purchase_order/view', async (req, res) => {
    const all_p_orders = await req.user_database.collection('PurchaseOrders').find().toArray();
    return res.send({ orders_request: all_p_orders });
});

express_app.get('/purchase_order/edit/:id', async (req, res) => {
    const { id } = req.params;
    const purchase_collection = req.user_database.collection('PurchaseOrders');
    const result = await hp.findInCollection(purchase_collection, { row_id: Number(id) });
    return res.send({ order_found: result });
});

express_app.post('/purchase_order/update', async (req, res) => {
    const purchase_order_collection = req.user_database.collection('PurchaseOrders');
    const update_id = { row_id: req.body['orderId'] };

    const purchase = {
        VendorId: req.body['vendorId'],
        VendorName: req.body['vendorName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        ProductName: req.body['productName'],
        Quantity: req.body['quantity'],
        TotalAmount: req.body['totalAmount']
    };

    await hp.updateCollection(purchase_order_collection, update_id, purchase);
    return res.send({ order_update: 'success' });
});

// ---------------------- SALES ORDERS ----------------------
express_app.post('/sales_order/create', async (req, res) => {
    const s_order_col = req.user_database.collection('SalesOrders');
    const sales_row_id = await hp.getNextRowId(s_order_col)

    const sales_order = {
        row_id: sales_row_id,
        CustomerId: req.body['customerId'],
        CustomerName: req.body['customerName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        ProductName: req.body['productName'],
        Quantity: req.body['quantity'],
        TotalAmount: req.body['totalAmount']
    };

    const insert_status = await hp.insertToCollection(s_order_col, sales_order);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/sales_order/view', async (req, res) => {
    const all_s_orders = await req.user_database.collection('SalesOrders').find().toArray();
    return res.send({ orders_request: all_s_orders });
});

express_app.get('/sales_order/edit/:id', async (req, res) => {
    const { id } = req.params;
    const sales_collection = req.user_database.collection('SalesOrders');
    const result = await hp.findInCollection(sales_collection, { row_id: Number(id) });
    return res.send({ order_found: result });
});

express_app.post('/sales_order/update', async (req, res) => {
    const sales_order_collection = req.user_database.collection('SalesOrders');
    const update_id = { row_id: req.body['orderId'] };

    const sale = {
        CustomerId: req.body['customerId'],
        CustomerName: req.body['customerName'],
        OrderDate: req.body['orderDate'],
        ExpectedDelivery: req.body['deliveryDate'],
        Status: req.body['status'],
        ProductId: req.body['productId'],
        ProductName: req.body['productName'],
        Quantity: req.body['quantity'],
        TotalAmount: req.body['totalAmount']
    };

    await hp.updateCollection(sales_order_collection, update_id, sale);
    return res.send({ order_update: 'success' });
});

// ---------------------- VENDORS ----------------------
express_app.post('/vendors/create', async (req, res) => {
    const vendors_col = req.user_database.collection('Vendors');
    const vendor_row_id = await hp.getNextRowId(vendors_col)

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

    const insert_status = await hp.insertToCollection(vendors_col, vendor);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/vendors/view', async (req, res) => {
    const all_vendors = await req.user_database.collection('Vendors').find().toArray();
    return res.send({ vendors_request: all_vendors });
});

express_app.get('/vendors/edit/:id', async (req, res) => {
    const { id } = req.params;
    const vendors_collection = req.user_database.collection('Vendors');
    const result = await hp.findInCollection(vendors_collection, { row_id: Number(id) });
    return res.send({ vendor_found: result });
});

express_app.post('/vendors/update', async (req, res) => {
    const vendors_collection = req.user_database.collection('Vendors');
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

    await hp.updateCollection(vendors_collection, update_id, vendor);
    return res.send({ vendor_update: 'success' });
});

// ---------------------- CONTACTS ----------------------
express_app.post('/contacts/create', async (req, res) => {
    const contacts_col = req.user_database.collection('Contacts');
    const contact_row_id = await hp.getNextRowId(contacts_col)

    const contact = {
        row_id: contact_row_id,
        FirstName: req.body['firstName'],
        LastName: req.body['lastName'],
        Email: req.body['email'],
        Phone: req.body['phone'],
        Mobile: req.body['mobile'],
        Designation: req.body['designation'],
        Department: req.body['department'],
        CustomerId: req.body['customerId'],
        Status: req.body['status']
    };

    const insert_status = await hp.insertToCollection(contacts_col, contact);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/contacts/view', async (req, res) => {
    const all_contacts = await req.user_database.collection('Contacts').find().toArray();
    return res.send({ contacts_request: all_contacts });
});

express_app.get('/contacts/edit/:id', async (req, res) => {
    const { id } = req.params;
    const contacts_collection = req.user_database.collection('Contacts');
    const result = await hp.findInCollection(contacts_collection, { row_id: Number(id) });
    return res.send({ contact_found: result });
});

express_app.post('/contacts/update', async (req, res) => {
    const contacts_collection = req.user_database.collection('Contacts');
    const update_id = { row_id: req.body['contactId'] };

    const contact = {
        FirstName: req.body['firstName'],
        LastName: req.body['lastName'],
        Email: req.body['email'],
        Phone: req.body['phone'],
        Mobile: req.body['mobile'],
        Designation: req.body['designation'],
        Department: req.body['department'],
        CustomerId: req.body['customerId'],
        Status: req.body['status']
    };

    await hp.updateCollection(contacts_collection, update_id, contact);
    return res.send({ contact_update: 'success' });
});

// ---------------------- TASKS ----------------------
express_app.post('/tasks/create', async (req, res) => {
    const tasks_col = req.user_database.collection('Tasks');
    const task_row_id = await hp.getNextRowId(tasks_col)

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

    const insert_status = await hp.insertToCollection(tasks_col, task);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/tasks/view', async (req, res) => {
    const all_tasks = await req.user_database.collection('Tasks').find().toArray();
    return res.send({ tasks_request: all_tasks });
});

express_app.get('/tasks/edit/:id', async (req, res) => {
    const { id } = req.params;
    const tasks_collection = req.user_database.collection('Tasks');
    const result = await hp.findInCollection(tasks_collection, { row_id: Number(id) });
    return res.send({ task_found: result });
});

express_app.post('/tasks/update', async (req, res) => {
    const task_collection = req.user_database.collection('Tasks');
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

    await hp.updateCollection(task_collection, update_id, task);
    return res.send({ task_update: 'success' });
});

express_app.get('/dashboard', async (req, res) => {
    const sales = await req.user_database.collection('SalesOrders').find().toArray();
    const purchase = await req.user_database.collection('PurchaseOrders').find().toArray();
    const tasks = await req.user_database.collection('Tasks').find().toArray();
    const contacts = await req.user_database.collection('Contacts').find().toArray();
    const vendors = await req.user_database.collection('Vendors').find().toArray();

    return res.send({ 
        sales: sales,
        purchase: purchase,
        tasks: tasks,
        contacts: contacts,
        vendors: vendors
    });
})


//Product page
express_app.post('/products/create', async (req, res) => {
    try {
        const product_col = req.user_database.collection('Products');
        const product_row_id = await hp.getNextRowId(product_col);

        const product = {
            row_id: product_row_id,
            Name: req.body['name'],
            SKU: req.body['sku'],
            CategoryId: req.body['categoryId'],
            CategoryName: req.body['categoryName'],
            Unit: req.body['unit'],
            Price: req.body['price'],
            Stock: req.body['stock'],
            Description: req.body['description'],
            ImageUrl: req.body['imageUrl'],
            CreatedAt: new Date(),
            UpdatedAt: new Date()
        };

        const insert_status = await hp.insertToCollection(product_col, product);
        return res.send({ status: insert_status ? 'inserted' : 'insert failed', product });
    } catch (err) {
        console.error('Error creating product:', err);
        return res.status(500).send({ status: 'error', message: err.message });
    }
});

// Get all products
express_app.get('/products/view', async (req, res) => {
    const all_products = await req.user_database.collection('Products').find().toArray();
    return res.send({ products_request: all_products });
});

// Get single product by row_id
express_app.get('/products/edit/:id', async (req, res) => {
    try {
        const product_col = req.user_database.collection('Products');
        const row_id = parseInt(req.params.id, 10);

        const product = await product_col.findOne({ row_id });
        if (!product) return res.status(404).send({ status: 'not found' });

        return res.send({ status: 'success', product_found: product });
    } catch (err) {
        console.error('Error fetching product:', err);
        return res.status(500).send({ status: 'error', message: err.message });
    }
});

express_app.post('/products/update', async (req, res) => {
    const product_collection = req.user_database.collection('Products');
    const update_id = { row_id: req.body['productId'] };

    const product = {
        Name: req.body['name'],
        SKU: req.body['sku'],
        CategoryId: req.body['categoryId'],
        CategoryName: req.body['categoryName'],
        Unit: req.body['unit'],
        Price: req.body['price'],
        Stock: req.body['stock'],
        Description: req.body['description'],
    };

    console.log(product)
    await hp.updateCollection(product_collection, update_id, product);
    return res.send({ product_update: 'success' });
});

// ---------------------- Customers ----------------------
express_app.post('/customers/create', async (req, res) => {
    const customers_col = req.user_database.collection('Customers');
    const customer_row_id = await hp.getNextRowId(customers_col)

    const customer = {
        row_id: customer_row_id,
        CustomerName: req.body['customerName'],
        CustomerEmail: req.body['email'],
        CustomerPhone: req.body['phone'],
        Website: req.body['website'],

        Street: req.body['street'],
        City: req.body['city'],
        State: req.body['state'],
        ZipCode: req.body['zip'],
        Country: req.body['country'],

        Status: req.body['status'],
        CustomerType: req.body['customerType']     
    };

    const insert_status = await hp.insertToCollection(customers_col, customer);
    return res.send({ status: insert_status ? 'inserted' : 'insert failed' });
});

express_app.get('/customers/view', async (req, res) => {
    const all_customers = await req.user_database.collection('Customers').find().toArray();
    return res.send({ customers_request: all_customers });
});

express_app.get('/customers/edit/:id', async (req, res) => {
    const { id } = req.params;
    const customers_collection = req.user_database.collection('Customers');
    const result = await hp.findInCollection(customers_collection, { row_id: Number(id) });
    return res.send({ customer_found: result });
});

express_app.post('/customers/update', async (req, res) => {
    const customers_collection = req.user_database.collection('Customers');
    const update_id = { row_id: req.body['customerId'] };

    const customer = {
        CustomerName: req.body['customerName'],
        CustomerEmail: req.body['email'],
        CustomerPhone: req.body['phone'],
        Website: req.body['website'],
        
        Street: req.body['street'],
        City: req.body['city'],
        State: req.body['state'],
        ZipCode: req.body['zip'],
        Country: req.body['country'],

        Status: req.body['status'],
        CustomerType: req.body['customerType']
    };

    await hp.updateCollection(customers_collection, update_id, customer);
    return res.send({ customer_update: 'success' });
});


// Sales Analysis
express_app.get("/analytics/sales-trends", hp.salesTrends);
express_app.get("/analytics/top-products", hp.topProducts);
express_app.get("/analytics/sales-vs-purchase", hp.salesVsPurchase);


express_app.get("/forecast", hp.salesForecast);
express_app.get("/inventory-risk", hp.inventoryRisk);
express_app.get("/reorder-suggestions", hp.reorderSuggestions);

express_app.listen(PORT, async () => {
    user_collection = await hp.connectDB(client)
    console.log('Listening...', PORT)
})
