const express = require('express');
const deviceController = require('@controllers/device.controller');
const authMiddleware = require('@middleware/auth.middleware');
const { allowRoles } = require('@middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', deviceController.getDevices);
router.post('/enroll', deviceController.enrollDevice);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/status', deviceController.getDeviceStatus);
router.post('/:id/lock', allowRoles('admin'), deviceController.lockManagedDevice);
router.post('/:id/unlock', allowRoles('admin'), deviceController.unlockManagedDevice);
router.get('/:id/commands', deviceController.getDeviceCommands);

module.exports = router;
