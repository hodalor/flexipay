const express = require('express');
const paymentController = require('@controllers/payment.controller');
const authMiddleware = require('@middleware/auth.middleware');
const { allowActions } = require('@middleware/permission.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', paymentController.list);
router.post('/initiate', paymentController.initiate);
router.post('/manual-record', allowActions('repayments.record'), paymentController.recordManual);
router.post('/:id/director-review', allowActions('repayments.approve_director'), paymentController.directorReview);
router.post('/:id/manager-review', allowActions('repayments.approve_manager'), paymentController.managerReview);
router.get('/:id/status', paymentController.getStatus);

module.exports = router;
