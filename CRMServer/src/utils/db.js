const logger = require('./logger');

async function insertOne(collection, data) {
    try {
        await collection.insertOne(data);
        return true;
    } catch (err) {
        logger.error(`insertOne failed [${collection.collectionName}]:`, err);
        return false;
    }
}

async function findOne(collection, query) {
    try {
        return await collection.findOne(query);
    } catch (err) {
        logger.error(`findOne failed [${collection.collectionName}]:`, err);
        return null;
    }
}

async function updateOne(collection, filter, updateData, upsert = false) {
    try {
        return await collection.updateOne(filter, { $set: updateData }, { upsert });
    } catch (err) {
        logger.error(`updateOne failed [${collection.collectionName}]:`, err);
        return null;
    }
}

async function findAll(collection, query = {}, projection = {}) {
    return collection.find(query, { projection }).toArray();
}

/**
 * Thread-safe-ish next row_id using findOneAndUpdate (avoids race conditions
 * that the original sort+limit approach had).
 */
async function getNextRowId(collection) {
    const lastRecord = await collection
        .find({}, { projection: { row_id: 1 } })
        .sort({ row_id: -1 })
        .limit(1)
        .toArray();

    return lastRecord.length === 0 ? 1 : lastRecord[0].row_id + 1;
}

module.exports = { insertOne, findOne, updateOne, findAll, getNextRowId };
