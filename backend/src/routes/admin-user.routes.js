const express = require('express');
const adminUserController = require('@controllers/admin-user.controller');
const authMiddleware = require('@middleware/auth.middleware');
const { allowActions } = require('@middleware/permission.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', allowActions('admin_users.view', 'admin_users.create', 'admin_users.update'), adminUserController.listAdminUsers);
router.post('/', allowActions('admin_users.create'), adminUserController.createAdminUser);
router.put('/:id', allowActions('admin_users.update'), adminUserController.updateAdminUser);

module.exports = router;
