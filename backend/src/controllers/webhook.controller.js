const { handleWebhook } = require('@services/payment.service');
const { success, failure } = require('@utils/response');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

async function paymentWebhook(req, res, next) {
  try {
    const signature = req.headers['verif-hash'] || req.headers['x-flw-signature'] || req.headers['x-signature'];
    const result = await handleWebhook(req.body, signature);

    if (!result.verified) {
      return failure(res, result.error || 'Webhook verification failed', 401);
    }

    if (result.processed) {
      broadcastRealtimeEvent('payment.webhook_processed', ['payments', 'loans', 'devices', 'customers'], {
        verified: result.verified
      });
    }

    return success(res, 'Webhook processed successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  paymentWebhook
};
