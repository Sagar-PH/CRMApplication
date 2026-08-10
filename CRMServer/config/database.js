const { MongoClient, ServerApiVersion } = require('mongodb');
const logger = require('../utils/logger');

let client;
let userCollection;

const COLLECTIONS = ['Contacts', 'Tasks', 'PurchaseOrders', 'SalesOrders', 'Vendors', 'Products', 'Customers'];

async function connectDB() {
    try {
        client = new MongoClient(process.env.MONGO_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            minPoolSize: 2,
        });

        await client.connect();

        const db = client.db(process.env.MONGO_DB_NAME);
        userCollection = db.collection('users');

        await userCollection.createIndex({ UserName: 1 }, { unique: true, sparse: true });
        await userCollection.createIndex({ Email: 1 }, { unique: true });

        logger.info(`MongoDB connected: ${process.env.MONGO_DB_NAME}`);
        return userCollection;
    } catch (err) {
        logger.error('MongoDB connection failed:', err);
        process.exit(1);
    }
}

async function disconnectDB() {
    if (client) {
        await client.close();
        logger.info('MongoDB disconnected');
    }
}

/**
 * Returns (and lazily creates) the per-user database with all required collections.
 */
async function getUserDB(dbName) {
    const db = client.db(dbName);
    return db;
}

/**
 * Bootstraps all required collections + indexes for a brand-new user database.
 */
async function bootstrapUserDB(dbName) {
    const db = client.db(dbName);
    await Promise.all(
        COLLECTIONS.map(name =>
            db.collection(name).createIndex({ row_id: 1 }, { unique: true })
        )
    );
    logger.info(`User database bootstrapped: ${dbName}`);
}

function getUserCollection() {
    return userCollection;
}

function getClient() {
    return client;
}

module.exports = { connectDB, disconnectDB, getUserDB, bootstrapUserDB, getUserCollection, getClient, COLLECTIONS };
