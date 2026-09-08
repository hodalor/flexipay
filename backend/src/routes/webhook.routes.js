const express = require('express');
const webhookController = require('@controllers/webhook.controller');

const router = express.Router();

router.post('/payment', webhookController.paymentWebhook);

module.exports = router;
