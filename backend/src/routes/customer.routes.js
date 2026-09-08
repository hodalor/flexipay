const express = require('express');
const customerController = require('@controllers/customer.controller');
const authMiddleware = require('@middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;

