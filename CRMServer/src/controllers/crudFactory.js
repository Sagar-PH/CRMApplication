const { insertOne, findOne, updateOne, findAll, getNextRowId } = require('../utils/db');
const { success, created, notFound, serverError } = require('../utils/response');
const { withCache, invalidatePattern } = require('../config/cache');
const logger = require('../utils/logger');

/**
 * Creates a standard CRUD controller for a given MongoDB collection name.
 *
 * @param {string} collectionName  - e.g. 'PurchaseOrders'
 * @param {Function} buildDocument - (body, rowId) => document object
 * @param {Function} buildUpdate   - (body) => update fields object
 * @param {string} resourceKey     - key used in response JSON (e.g. 'orders')
 */
function createCRUDController(collectionName, buildDocument, buildUpdate, resourceKey) {
    const cachePrefix = (userDB) => `cache:${userDB.databaseName}:${collectionName}`;

    return {
        async create(req, res) {
            try {
                const col = req.userDB.collection(collectionName);
                const rowId = await getNextRowId(col);
                const doc = buildDocument(req.body, rowId);

                const ok = await insertOne(col, doc);
                if (!ok) return serverError(res, new Error('Insert failed'));

                await invalidatePattern(`${cachePrefix(req.userDB)}:*`);
                return created(res, { [resourceKey]: doc });
            } catch (err) {
                logger.error(`${collectionName} create error:`, err);
                return serverError(res, err);
            }
        },

        async getAll(req, res) {
            try {
                const key = `${cachePrefix(req.userDB)}:all`;
                const data = await withCache(key, () =>
                    findAll(req.userDB.collection(collectionName))
                );
                return success(res, { [resourceKey]: data });
            } catch (err) {
                logger.error(`${collectionName} getAll error:`, err);
                return serverError(res, err);
            }
        },

        async getById(req, res) {
            try {
                const id = parseInt(req.params.id, 10);
                const key = `${cachePrefix(req.userDB)}:${id}`;
                const doc = await withCache(key, () =>
                    findOne(req.userDB.collection(collectionName), { row_id: id })
                );

                if (!doc) return notFound(res);
                return success(res, { [resourceKey]: doc });
            } catch (err) {
                logger.error(`${collectionName} getById error:`, err);
                return serverError(res, err);
            }
        },

        async update(req, res) {
            try {
                const id = req.body.id ?? req.params.id;
                const updateFields = buildUpdate(req.body);
                const col = req.userDB.collection(collectionName);

                const result = await updateOne(col, { row_id: Number(id) }, updateFields);
                if (!result || result.matchedCount === 0) return notFound(res);

                await invalidatePattern(`${cachePrefix(req.userDB)}:*`);
                return success(res, { message: 'Updated successfully' });
            } catch (err) {
                logger.error(`${collectionName} update error:`, err);
                return serverError(res, err);
            }
        },
    };
}

module.exports = { createCRUDController };
