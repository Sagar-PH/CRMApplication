const express = require('express')
const session = require('express-session')

const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const express_app = express()

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

const PORT = 8080

const url = "mongodb+srv://sagarph_db_user:Sagar%401701@cluster0.7epy1hb.mongodb.net/?appName=Cluster0";
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let user_collection = undefined;

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

express_app.post('/logout', async (req, res) => {
    console.log('logout requested..', req.body)

    if (isAuthenticated(req)) {
        req.session.user = null
    }

    return res.send({ type: 'logout', status: "Redirect" })
})

express_app.post("/logout", (req, res) => {
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
    console.log('login requested..', req.body)

    if (isAuthenticated(req)) {
        return res.send({ type: 'register', status: "Redirect" })
    }

    var user_data = {
        Name: req.body['fullname'],
        UserName: req.body['username'],
        Email: req.body['email'],
        Password: req.body['password']
    }

    let insert_status = await insertUser(user_data)

    if (insert_status) {
        return res.send({ type: 'register', status: "Success" })
    }

    return res.send({ type: 'register', status: "Failed" })

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
        await user_collection.createIndex({ username: 1 }, { unique: true });

        console.log("Connected to MongoDB", db.users);
    } catch (err) {
        console.error(err);
    }
}

async function insertUser(user_data) {
    try {
        await user_collection.insertOne(user_data)
        return true
    } catch (err) {
        return false
    }
}

async function findInCollection(find_query) {
    try {
        const result = await user_collection.findOne(find_query)
        console.log("Found the data:: ", result)
    } catch (err) {
        console.log('Querying Failed!', err)
    }
}

async function updateCollection(udt_collection, update_data, upsert = false) {
    try {
        const result = await user_collection.updateOne(
            udt_collection,
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