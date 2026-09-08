const express = require('express');
const adminUserRoutes = require('@routes/admin-user.routes');
const authRoutes = require('@routes/auth.routes');
const customerRoutes = require('@routes/customer.routes');
const deviceRoutes = require('@routes/device.routes');
const eventsRoutes = require('@routes/events.routes');
const loanRoutes = require('@routes/loan.routes');
const paymentRoutes = require('@routes/payment.routes');
const webhookRoutes = require('@routes/webhook.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin-users', adminUserRoutes);
router.use('/customers', customerRoutes);
router.use('/devices', deviceRoutes);
router.use('/events', eventsRoutes);
router.use('/loans', loanRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
