const axios = require('axios');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getRedisClient } = require('@config/redis');
const { Customer, Device, Loan } = require('@models');
const logger = require('@utils/logger');
const { formatAmount, normalizeAmountInt } = require('@utils/money');

function getFirebaseApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return admin.initializeApp({
      credential: admin.credential.cert(require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH))
    });
  }

  throw new Error('Firebase Admin credentials are not configured');
}

async function queueNotification(payload) {
  const client = getRedisClient();

  if (client && client.isOpen) {
    await client.lPush('flexipay:notifications', JSON.stringify(payload));
  }
}

/**
 * Sends a push message through Firebase Admin.
 *
 * @param {string} deviceToken
 * @param {string} platform
 * @param {string} title
 * @param {string} body
 * @param {object} data
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendPush(deviceToken, platform, title, body, data) {
  try {
    if (!deviceToken) {
      throw new Error('Device token is required for push notifications');
    }

    getFirebaseApp();
    const messageId = await admin.messaging().send({
      token: deviceToken,
      notification: {
        title,
        body
      },
      data: Object.keys(data || {}).reduce(function serialize(accumulator, key) {
        accumulator[key] = String(data[key]);
        return accumulator;
      }, {
        platform: String(platform || 'unknown')
      })
    });

    await queueNotification({
      channel: 'push',
      recipient: deviceToken,
      title,
      body,
      data
    });

    return {
      success: true,
      messageId
    };
  } catch (error) {
    logger.error('Push notification failed', {
      error: error.message,
      platform
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sends an SMS via Africa's Talking.
 *
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function sendSMS(phone, message) {
  try {
    const response = await axios.post('https://api.africastalking.com/version1/messaging', new URLSearchParams({
      username: process.env.AT_USERNAME || '',
      to: phone,
      message,
      from: process.env.AT_SENDER_ID || ''
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: process.env.AT_API_KEY || ''
      }
    });

    await queueNotification({
      channel: 'sms',
      recipient: phone,
      message
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('SMS delivery failed', {
      error: error.message,
      phone
    });

    return {
      success: false,
      error: error.response?.data?.SMSMessageData?.Message || error.message
    };
  }
}

/**
 * Sends email using SMTP credentials.
 *
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const response = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });

    await queueNotification({
      channel: 'email',
      recipient: to,
      subject
    });

    return {
      success: true,
      messageId: response.messageId
    };
  } catch (error) {
    logger.error('Email delivery failed', {
      error: error.message,
      to
    });

    return {
      success: false,
      error: error.message
    };
  }
}

async function resolveCustomerContext(customerId, loanId) {
  const customer = await Customer.findByPk(customerId);
  const loan = loanId ? await Loan.findByPk(loanId) : null;
  const device = loan ? await Device.findByPk(loan.deviceId) : await Device.findOne({
    where: {
      customerId
    },
    order: [['updatedAt', 'DESC']]
  });

  if (!customer) {
    throw new Error('Customer not found for notification');
  }

  return { customer, loan, device };
}

/**
 * Notifies a customer that a payment was received and includes the remaining balance.
 *
 * @param {string} customerId
 * @param {number} amount
 * @param {string} loanId
 * @returns {Promise<{ success: boolean }>}
 */
async function notifyPaymentReceived(customerId, amount, loanId) {
  try {
    const { customer, loan, device } = await resolveCustomerContext(customerId, loanId);
    const remainingBalance = loan ? Math.max(normalizeAmountInt(loan.totalPayable) - normalizeAmountInt(loan.amountPaid) - normalizeAmountInt(amount), 0) : 0;
    const title = 'Payment received';
    const body = 'We received ZMW ' + formatAmount(amount) + ' for your FlexiPay loan.';
    const message = body + ' Remaining balance: ZMW ' + formatAmount(remainingBalance) + '.';

    if (device && (device.fcmToken || device.apnsToken)) {
      await sendPush(device.fcmToken || device.apnsToken, device.type, title, message, {
        type: 'PAYMENT_RECEIVED',
        loanId,
        amount
      });
    }

    await sendSMS(customer.phone, message);
    await sendEmail(customer.email, title, '<p>' + message + '</p>');

    return { success: true };
  } catch (error) {
    logger.error('Payment received notification failed', {
      error: error.message,
      customerId,
      loanId
    });
    return { success: false };
  }
}

/**
 * Notifies a customer that a device lock has been enforced.
 *
 * @param {string} customerId
 * @param {string} deviceId
 * @returns {Promise<{ success: boolean }>}
 */
async function notifyDeviceLocked(customerId, deviceId) {
  try {
    const customer = await Customer.findByPk(customerId);
    const device = await Device.findByPk(deviceId);

    if (!customer || !device) {
      throw new Error('Customer or device not found for device lock notification');
    }

    const supportNumber = process.env.SUPPORT_PHONE || '+260000000000';
    const body = 'Your financed device has been locked due to overdue repayments. Please pay to restore access or contact ' + supportNumber + '.';

    await sendSMS(customer.phone, body);
    await sendEmail(customer.email, 'FlexiPay device locked', '<p>' + body + '</p>');

    if (device.fcmToken || device.apnsToken) {
      await sendPush(device.fcmToken || device.apnsToken, device.type, 'Device locked', body, {
        type: 'LOCK',
        deviceId: device.id
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Device locked notification failed', {
      error: error.message,
      customerId,
      deviceId
    });
    return { success: false };
  }
}

/**
 * Notifies a customer that a payment due date is approaching.
 *
 * @param {string} customerId
 * @param {string} loanId
 * @param {number} daysUntilDue
 * @returns {Promise<{ success: boolean }>}
 */
async function notifyPaymentDue(customerId, loanId, daysUntilDue) {
  try {
    const { customer, loan, device } = await resolveCustomerContext(customerId, loanId);
    const amountDue = loan ? Math.max(normalizeAmountInt(loan.totalPayable) - normalizeAmountInt(loan.amountPaid), 0) : 0;
    const dueDate = loan && loan.nextDueDate ? new Date(loan.nextDueDate).toDateString() : 'soon';
    const body = 'Your FlexiPay installment of ZMW ' + formatAmount(amountDue) + ' is due in ' + daysUntilDue + ' day(s) on ' + dueDate + '. Payment options: mobile money, card, or bank transfer.';

    await sendSMS(customer.phone, body);
    await sendEmail(customer.email, 'FlexiPay payment reminder', '<p>' + body + '</p>');

    if (device && (device.fcmToken || device.apnsToken)) {
      await sendPush(device.fcmToken || device.apnsToken, device.type, 'Payment due reminder', body, {
        type: 'PAYMENT_DUE',
        loanId,
        daysUntilDue
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Payment due notification failed', {
      error: error.message,
      customerId,
      loanId
    });
    return { success: false };
  }
}

module.exports = {
  sendPush,
  sendSMS,
  sendEmail,
  notifyPaymentReceived,
  notifyDeviceLocked,
  notifyPaymentDue
};
