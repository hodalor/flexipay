const {
  recordManualPayment,
  reviewManualPayment,
  initiatePayment,
  getPaymentStatus
} = require('@services/payment.service');
const { AdminUser, Customer, Device, Loan, Payment } = require('@models');
const { toAmountInt } = require('@utils/money');
const { success, failure } = require('@utils/response');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

async function list(req, res, next) {
  try {
    const where = {};

    if (req.user?.userType !== 'admin') {
      where.customerId = req.user.customerId;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Loan,
          as: 'loan',
          include: [
            { model: Customer, as: 'customer' },
            { model: Device, as: 'device' }
          ]
        },
        { model: Customer, as: 'customer' },
        { model: AdminUser, as: 'initiator' },
        { model: AdminUser, as: 'directorApprover' },
        { model: AdminUser, as: 'managerApprover' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Repayments fetched successfully', payments);
  } catch (error) {
    return next(error);
  }
}

async function initiate(req, res, next) {
  try {
    if (!req.body.loanId || !req.body.amount || !req.body.method) {
      return failure(res, 'loanId, amount, and method are required', 400);
    }

    let customerId = req.user.customerId || null;

    if (req.user?.userType === 'admin') {
      if (!req.body.customerId) {
        return failure(res, 'customerId is required for admin-initiated payments', 400);
      }

      customerId = req.body.customerId;
    } else if (req.body.customerId && String(req.body.customerId) !== String(req.user.customerId)) {
      return failure(res, 'You can only initiate payments for your own account', 403);
    }

    const payment = await initiatePayment(
      req.body.loanId,
      customerId,
      toAmountInt(req.body.amount),
      req.body.method,
      {
        network: req.body.network
      }
    );

    broadcastRealtimeEvent('payment.initiated', ['payments', 'loans'], {
      loanId: req.body.loanId,
      customerId
    });

    return success(res, 'Payment initiated successfully', payment, 201);
  } catch (error) {
    return next(error);
  }
}

async function recordManual(req, res, next) {
  try {
    if (!req.body.loanId || !req.body.customerId || !req.body.amount) {
      return failure(res, 'loanId, customerId, and amount are required', 400);
    }

    const payment = await recordManualPayment(
      req.body.loanId,
      req.body.customerId,
      toAmountInt(req.body.amount),
      req.user.adminUserId,
      {
        channel: req.body.channel,
        note: req.body.note
      }
    );

    broadcastRealtimeEvent('repayment.recorded', ['payments', 'loans'], {
      paymentId: payment.id,
      loanId: payment.loanId
    });

    return success(res, 'Manual repayment recorded successfully', payment, 201);
  } catch (error) {
    return next(error);
  }
}

async function directorReview(req, res, next) {
  try {
    if (!req.body.decision) {
      return failure(res, 'decision is required', 400);
    }

    const payment = await reviewManualPayment(req.params.id, 'director', req.body.decision, req.body.remark, req.user.adminUserId);
    broadcastRealtimeEvent('repayment.director_reviewed', ['payments', 'loans'], {
      paymentId: payment.id,
      decision: req.body.decision
    });
    return success(res, 'Director review submitted successfully', payment);
  } catch (error) {
    return next(error);
  }
}

async function managerReview(req, res, next) {
  try {
    if (!req.body.decision) {
      return failure(res, 'decision is required', 400);
    }

    const payment = await reviewManualPayment(req.params.id, 'manager', req.body.decision, req.body.remark, req.user.adminUserId);
    broadcastRealtimeEvent('repayment.manager_reviewed', ['payments', 'loans', 'devices', 'customers'], {
      paymentId: payment.id,
      decision: req.body.decision
    });
    return success(res, 'Manager review submitted successfully', payment);
  } catch (error) {
    return next(error);
  }
}

async function getStatus(req, res, next) {
  try {
    const payment = await getPaymentStatus(req.params.id);
    return success(res, 'Payment status fetched successfully', payment);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  directorReview,
  initiate,
  list,
  managerReview,
  recordManual,
  getStatus
};
