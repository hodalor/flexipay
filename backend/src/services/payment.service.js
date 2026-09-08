const crypto = require('crypto');
const axios = require('axios');
const { AdminUser, Customer, Loan, Payment } = require('@models');
const { generateReference } = require('@utils/crypto');
const logger = require('@utils/logger');
const { formatAmount, fromAmountInt, normalizeAmountInt } = require('@utils/money');
const { processSuccessfulPayment } = require('@services/loan.service');

function flutterwaveHeaders() {
  return {
    Authorization: 'Bearer ' + process.env.PAYMENT_GATEWAY_SECRET,
    'Content-Type': 'application/json'
  };
}

function paymentChannelLabel(method) {
  if (method === 'mobile_money') {
    return 'Mobile payment';
  }

  if (method === 'card') {
    return 'Card payment';
  }

  if (method === 'cash') {
    return 'Manual cash';
  }

  return 'Manual payment';
}

/**
 * Creates a pending payment and dispatches it to Flutterwave.
 *
 * @param {string} loanId
 * @param {string} customerId
 * @param {number} amount
 * @param {string} method
 * @param {object} metadata
 * @returns {Promise<{ paymentId: string, redirectUrl?: string, ussdCode?: string, txRef: string }>}
 * @throws {Error}
 */
async function initiatePayment(loanId, customerId, amount, method, metadata) {
  const [loan, customer] = await Promise.all([
    Loan.findByPk(loanId),
    Customer.findByPk(customerId)
  ]);

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (!customer) {
    throw new Error('Customer not found');
  }

  const payment = await Payment.create({
    loanId,
    customerId,
    amount: normalizeAmountInt(amount),
    method,
    channel: paymentChannelLabel(method),
    reference: generateReference('PAY'),
    gatewayRef: null,
    status: 'pending',
    approvalStatus: 'gateway_pending',
    directorDecision: 'pending',
    managerDecision: 'pending'
  });

  const amountDisplay = fromAmountInt(payment.amount);

  try {
    if (method === 'mobile_money') {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/charges?type=mobile_money_zambia',
        {
          amount: amountDisplay,
          currency: 'ZMW',
          email: customer.email,
          phone_number: customer.phone,
          network: metadata?.network || 'MTN',
          fullname: customer.fullName,
          tx_ref: payment.id
        },
        {
          headers: flutterwaveHeaders()
        }
      );

      await payment.update({
        gatewayRef: String(response.data?.data?.id || payment.id),
        providerResponse: response.data
      });

      return {
        paymentId: payment.id,
        txRef: payment.id,
        ussdCode: response.data?.meta?.authorization?.note || response.data?.meta?.authorization?.redirect,
        redirectUrl: response.data?.meta?.authorization?.redirect
      };
    }

    if (method === 'card') {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: payment.id,
          amount: amountDisplay,
          currency: 'ZMW',
          redirect_url: process.env.FLW_REDIRECT_URL || 'https://dashboard.flexipay.local/payments/callback',
          customer: {
            email: customer.email,
            phonenumber: customer.phone,
            name: customer.fullName
          },
          customizations: {
            title: 'FlexiPay Loan Payment',
            description: 'Loan repayment for ' + loan.id
          }
        },
        {
          headers: flutterwaveHeaders()
        }
      );

      await payment.update({
        gatewayRef: String(response.data?.data?.id || payment.id),
        providerResponse: response.data
      });

      return {
        paymentId: payment.id,
        txRef: payment.id,
        redirectUrl: response.data?.data?.link
      };
    }

    await payment.update({
      status: 'failed',
      providerResponse: {
        error: 'Unsupported payment method'
      }
    });

    throw new Error('Unsupported payment method');
  } catch (error) {
    logger.error('Payment initiation failed', {
      paymentId: payment.id,
      error: error.response?.data || error.message
    });

    await payment.update({
      status: 'failed',
      providerResponse: error.response?.data || { error: error.message }
    });

    throw new Error(error.response?.data?.message || error.message || 'Unable to initiate payment');
  }
}

async function recordManualPayment(loanId, customerId, amount, initiatedByAdminUserId, metadata) {
  const [loan, customer, initiator] = await Promise.all([
    Loan.findByPk(loanId),
    Customer.findByPk(customerId),
    initiatedByAdminUserId ? AdminUser.findByPk(initiatedByAdminUserId) : null
  ]);

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (!initiator) {
    throw new Error('Initiating admin user not found');
  }

  return Payment.create({
    loanId,
    customerId,
    amount: normalizeAmountInt(amount),
    method: 'cash',
    channel: metadata?.channel || 'Manual cash',
    reference: generateReference('PAY'),
    status: 'pending',
    approvalStatus: 'pending_director',
    initiatedByAdminUserId,
    providerResponse: {
      note: metadata?.note || null
    }
  });
}

async function reviewManualPayment(paymentId, stage, decision, remark, approverId) {
  const payment = await Payment.findByPk(paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.method !== 'cash') {
    throw new Error('Only manual cash repayments follow approval workflow');
  }

  if (stage === 'director') {
    if (payment.approvalStatus !== 'pending_director') {
      throw new Error('This repayment is not waiting for director approval');
    }

    if (decision === 'reject') {
      await payment.update({
        status: 'failed',
        approvalStatus: 'rejected',
        directorApproverId: approverId,
        directorDecision: 'rejected',
        directorRemark: remark || null,
        directorDecidedAt: new Date(),
        completedAt: new Date()
      });

      return payment;
    }

    await payment.update({
      approvalStatus: 'pending_manager',
      directorApproverId: approverId,
      directorDecision: 'approved',
      directorRemark: remark || null,
      directorDecidedAt: new Date()
    });

    return payment;
  }

  if (stage === 'manager') {
    if (payment.approvalStatus !== 'pending_manager') {
      throw new Error('This repayment is not waiting for manager approval');
    }

    if (decision === 'reject') {
      await payment.update({
        status: 'failed',
        approvalStatus: 'rejected',
        managerApproverId: approverId,
        managerDecision: 'rejected',
        managerRemark: remark || null,
        managerDecidedAt: new Date(),
        completedAt: new Date()
      });

      return payment;
    }

    await payment.update({
      managerApproverId: approverId,
      managerDecision: 'approved',
      managerRemark: remark || null,
      managerDecidedAt: new Date()
    });

    await processSuccessfulPayment(payment.id);
    await payment.reload();
    await payment.update({
      approvalStatus: 'completed',
      completedAt: payment.completedAt || new Date()
    });

    return payment;
  }

  throw new Error('Unsupported approval stage');
}

/**
 * Verifies a Flutterwave transaction against the expected amount.
 *
 * @param {string|number} transactionId
 * @param {number} expectedAmount
 * @returns {Promise<{ verified: boolean, data: object }>}
 */
async function verifyPayment(transactionId, expectedAmount) {
  try {
    const response = await axios.get(
      'https://api.flutterwave.com/v3/transactions/' + transactionId + '/verify',
      {
        headers: flutterwaveHeaders()
      }
    );
    const amountMatches = Math.round(Number(response.data?.data?.amount || 0) * 100) === normalizeAmountInt(expectedAmount);
    const verified = response.data?.data?.status === 'successful' && amountMatches;

    return {
      verified,
      data: response.data
    };
  } catch (error) {
    logger.error('Payment verification failed', {
      transactionId,
      error: error.response?.data || error.message
    });

    return {
      verified: false,
      data: error.response?.data || { error: error.message }
    };
  }
}

/**
 * Returns the current payment state.
 *
 * @param {string} paymentId
 * @returns {Promise<object>}
 * @throws {Error}
 */
async function getPaymentStatus(paymentId) {
  const payment = await Payment.findByPk(paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  return {
    id: payment.id,
    status: payment.status,
    approvalStatus: payment.approvalStatus,
    amount: payment.amount,
    displayAmount: formatAmount(payment.amount),
    paidAt: payment.paidAt,
    gatewayRef: payment.gatewayRef,
    reference: payment.reference
  };
}

/**
 * Handles a Flutterwave webhook after validating the configured signature hash.
 *
 * @param {object} payload
 * @param {string} signature
 * @returns {Promise<{ processed: boolean, verified: boolean, payment?: object, error?: string }>}
 */
async function handleWebhook(payload, signature) {
  const rawPayload = JSON.stringify(payload);
  const calculatedHash = crypto
    .createHmac('sha256', process.env.FLW_SECRET_HASH || '')
    .update(rawPayload)
    .digest('hex');

  if (!signature || signature !== calculatedHash) {
    logger.warn('Flutterwave webhook signature validation failed');
    return {
      processed: false,
      verified: false,
      error: 'Invalid webhook signature'
    };
  }

  const data = payload.data || payload;
  const txRef = data.tx_ref || data.txRef || payload.tx_ref || payload.txRef;

  if (!txRef) {
    return {
      processed: false,
      verified: true,
      error: 'Webhook payload did not include a payment reference'
    };
  }

  const payment = await Payment.findByPk(txRef);

  if (!payment) {
    return {
      processed: false,
      verified: true,
      error: 'Referenced payment was not found'
    };
  }

  await payment.update({
    gatewayRef: String(data.id || payment.gatewayRef || ''),
    providerResponse: payload
  });

  if (data.status === 'successful') {
    const verification = await verifyPayment(data.id, payment.amount);

    if (!verification.verified) {
      return {
        processed: false,
        verified: true,
        error: 'Webhook transaction verification failed'
      };
    }

    const updatedLoan = await processSuccessfulPayment(txRef);
    await payment.update({
      approvalStatus: 'completed',
      completedAt: new Date(),
      channel: payment.channel || 'Mobile payment'
    });

    return {
      processed: true,
      verified: true,
      payment: updatedLoan
    };
  }

  await payment.update({
    status: 'failed',
    approvalStatus: 'rejected',
    completedAt: new Date()
  });

  return {
    processed: true,
    verified: true
  };
}

module.exports = {
  recordManualPayment,
  reviewManualPayment,
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  handleWebhook
};
