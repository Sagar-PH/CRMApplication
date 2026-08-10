const router = require('express').Router();
const {
    purchaseOrderController,
    salesOrderController,
    vendorController,
    contactController,
    taskController,
    productController,
    customerController,
} = require('../controllers/resourceControllers');

/**
 * Registers standard CRUD routes for a resource controller.
 *   POST   /base/        → create
 *   GET    /base/        → getAll
 *   GET    /base/:id     → getById
 *   PUT    /base/:id     → update
 */
function registerCRUD(router, base, ctrl) {
    router.post(`${base}/`,      ctrl.create.bind(ctrl));
    router.get(`${base}/`,       ctrl.getAll.bind(ctrl));
    router.get(`${base}/:id`,    ctrl.getById.bind(ctrl));
    router.put(`${base}/:id`,    ctrl.update.bind(ctrl));
}

registerCRUD(router, '/purchase-orders', purchaseOrderController);
registerCRUD(router, '/sales-orders',    salesOrderController);
registerCRUD(router, '/vendors',         vendorController);
registerCRUD(router, '/contacts',        contactController);
registerCRUD(router, '/tasks',           taskController);
registerCRUD(router, '/products',        productController);
registerCRUD(router, '/customers',       customerController);

module.exports = router;
