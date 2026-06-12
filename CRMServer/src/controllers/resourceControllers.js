const { createCRUDController } = require('./crudFactory');

// ─── Purchase Orders ─────────────────────────────────────────────────────────
const purchaseOrderController = createCRUDController(
    'PurchaseOrders',
    (body, rowId) => ({
        row_id: rowId,
        VendorId: body.vendorId,
        VendorName: body.vendorName,
        OrderDate: body.orderDate,
        ExpectedDelivery: body.deliveryDate,
        Status: body.status,
        ProductId: body.productId,
        ProductName: body.productName,
        Quantity: Number(body.quantity),
        TotalAmount: Number(body.totalAmount),
        CreatedAt: new Date(),
    }),
    (body) => ({
        VendorId: body.vendorId,
        VendorName: body.vendorName,
        OrderDate: body.orderDate,
        ExpectedDelivery: body.deliveryDate,
        Status: body.status,
        ProductId: body.productId,
        ProductName: body.productName,
        Quantity: Number(body.quantity),
        TotalAmount: Number(body.totalAmount),
        UpdatedAt: new Date(),
    }),
    'orders'
);

// ─── Sales Orders ─────────────────────────────────────────────────────────────
const salesOrderController = createCRUDController(
    'SalesOrders',
    (body, rowId) => ({
        row_id: rowId,
        CustomerId: body.customerId,
        CustomerName: body.customerName,
        OrderDate: body.orderDate,
        Status: body.status,
        ProductId: body.productId,
        ProductName: body.productName,
        Quantity: Number(body.quantity),
        TotalAmount: Number(body.totalAmount),
        CreatedAt: new Date(),
    }),
    (body) => ({
        CustomerId: body.customerId,
        CustomerName: body.customerName,
        OrderDate: body.orderDate,
        Status: body.status,
        ProductId: body.productId,
        ProductName: body.productName,
        Quantity: Number(body.quantity),
        TotalAmount: Number(body.totalAmount),
        UpdatedAt: new Date(),
    }),
    'orders'
);

// ─── Vendors ──────────────────────────────────────────────────────────────────
const vendorController = createCRUDController(
    'Vendors',
    (body, rowId) => ({
        row_id: rowId,
        VendorName: body.vendorName,
        Email: body.email,
        Phone: body.phone,
        Address: body.address,
        Status: body.status,
        CreatedAt: new Date(),
    }),
    (body) => ({
        VendorName: body.vendorName,
        Email: body.email,
        Phone: body.phone,
        Address: body.address,
        Status: body.status,
        UpdatedAt: new Date(),
    }),
    'vendors'
);

// ─── Contacts ────────────────────────────────────────────────────────────────
const contactController = createCRUDController(
    'Contacts',
    (body, rowId) => ({
        row_id: rowId,
        FirstName: body.firstName,
        LastName: body.lastName,
        Email: body.email,
        Phone: body.phone,
        Mobile: body.mobile,
        Designation: body.designation,
        Department: body.department,
        CustomerId: body.customerId,
        Status: body.status,
        CreatedAt: new Date(),
    }),
    (body) => ({
        FirstName: body.firstName,
        LastName: body.lastName,
        Email: body.email,
        Phone: body.phone,
        Mobile: body.mobile,
        Designation: body.designation,
        Department: body.department,
        CustomerId: body.customerId,
        Status: body.status,
        UpdatedAt: new Date(),
    }),
    'contacts'
);

// ─── Tasks ────────────────────────────────────────────────────────────────────
const taskController = createCRUDController(
    'Tasks',
    (body, rowId) => ({
        row_id: rowId,
        Subject: body.subject,
        Description: body.description,
        RelatedType: body.relatedType,
        RelatedId: body.relatedId,
        AssignedTo: body.assignedTo,
        Status: body.status,
        DueDate: body.dueDate,
        CreatedAt: new Date(),
    }),
    (body) => ({
        Subject: body.subject,
        Description: body.description,
        RelatedType: body.relatedType,
        RelatedId: body.relatedId,
        AssignedTo: body.assignedTo,
        Status: body.status,
        DueDate: body.dueDate,
        UpdatedAt: new Date(),
    }),
    'tasks'
);

// ─── Products ─────────────────────────────────────────────────────────────────
const productController = createCRUDController(
    'Products',
    (body, rowId) => ({
        row_id: rowId,
        Name: body.name,
        SKU: body.sku,
        CategoryId: body.categoryId,
        CategoryName: body.categoryName,
        Unit: body.unit,
        Price: Number(body.price),
        Stock: Number(body.stock),
        Description: body.description,
        ImageUrl: body.imageUrl || null,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
    }),
    (body) => ({
        Name: body.name,
        SKU: body.sku,
        CategoryId: body.categoryId,
        CategoryName: body.categoryName,
        Unit: body.unit,
        Price: Number(body.price),
        Stock: Number(body.stock),
        Description: body.description,
        UpdatedAt: new Date(),
    }),
    'products'
);

// ─── Customers ────────────────────────────────────────────────────────────────
const customerController = createCRUDController(
    'Customers',
    (body, rowId) => ({
        row_id: rowId,
        CustomerName: body.customerName,
        CustomerEmail: body.email,
        CustomerPhone: body.phone,
        Website: body.website,
        Street: body.street,
        City: body.city,
        State: body.state,
        ZipCode: body.zip,
        Country: body.country,
        Status: body.status,
        CustomerType: body.customerType,
        CreatedAt: new Date(),
    }),
    (body) => ({
        CustomerName: body.customerName,
        CustomerEmail: body.email,
        CustomerPhone: body.phone,
        Website: body.website,
        Street: body.street,
        City: body.city,
        State: body.state,
        ZipCode: body.zip,
        Country: body.country,
        Status: body.status,
        CustomerType: body.customerType,
        UpdatedAt: new Date(),
    }),
    'customers'
);

module.exports = {
    purchaseOrderController,
    salesOrderController,
    vendorController,
    contactController,
    taskController,
    productController,
    customerController,
};
