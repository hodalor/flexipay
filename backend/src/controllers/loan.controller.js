const { Op } = require('sequelize');
const { Customer, Device, Loan, Payment } = require('@models');
const { success, failure } = require('@utils/response');
const { toAmountInt, formatAmount, normalizeAmountInt } = require('@utils/money');
const {
  calculateMonthlyPayment,
  generateRepaymentSchedule,
  calculateLoanHealth
} = require('@services/loan.service');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

function validateLoanPayload(payload) {
  const requiredFields = ['customerId', 'deviceId', 'principalAmount', 'interestRate', 'termMonths'];

  return requiredFields.filter(function findMissing(field) {
    return payload[field] === undefined || payload[field] === null || payload[field] === '';
  });
}

async function createLoan(req, res, next) {
  try {
    const validationErrors = validateLoanPayload(req.body);

    if (validationErrors.length) {
      return failure(res, 'Missing required loan fields', 400, validationErrors);
    }

    const customer = await Customer.findByPk(req.body.customerId);
    const device = await Device.findByPk(req.body.deviceId);

    if (!customer || !device) {
      return failure(res, 'Customer or device not found', 404);
    }

    if (String(device.customerId) !== String(customer.id)) {
      return failure(res, 'This device belongs to another customer and cannot be financed here', 409);
    }

    const activeDeviceLoan = await Loan.findOne({
      where: {
        deviceId: device.id,
        status: {
          [Op.in]: ['active', 'defaulted']
        }
      }
    });

    if (activeDeviceLoan) {
      return failure(res, 'This device already has an in-progress loan. Cancel or complete the current loan first.', 409);
    }

    const principalAmount = toAmountInt(req.body.principalAmount);
    const downPayment = toAmountInt(req.body.downPayment || 0);
    const financedAmount = principalAmount - downPayment;
    const termMonths = Number(req.body.termMonths);
    const interestRate = Number(req.body.interestRate);
    const paymentTerms = calculateMonthlyPayment(financedAmount, interestRate, termMonths);
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const nextDueDate = new Date(startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const loan = await Loan.create({
      customerId: customer.id,
      deviceId: device.id,
      principalAmount,
      downPayment,
      interestRate,
      termMonths,
      monthlyPayment: paymentTerms.monthlyPayment,
      totalPayable: paymentTerms.totalPayable,
      amountPaid: 0,
      status: 'active',
      nextDueDate,
      gracePeriodDays: Number(req.body.gracePeriodDays || 5),
      startDate
    });

    const fullLoan = await Loan.findByPk(loan.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Device, as: 'device' },
        { model: Payment, as: 'payments' }
      ]
    });

    broadcastRealtimeEvent('loan.created', ['loans', 'devices', 'customers', 'payments'], {
      loanId: loan.id,
      customerId: customer.id,
      deviceId: device.id
    });

    return success(res, 'Loan created successfully', {
      loan: fullLoan,
      amortization: generateRepaymentSchedule(fullLoan),
      display: {
        principalAmount: formatAmount(fullLoan.principalAmount),
        downPayment: formatAmount(fullLoan.downPayment),
        monthlyPayment: formatAmount(fullLoan.monthlyPayment),
        totalPayable: formatAmount(fullLoan.totalPayable)
      }
    }, 201);
  } catch (error) {
    return next(error);
  }
}

async function cancelLoan(req, res, next) {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Device, as: 'device' },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!loan) {
      return failure(res, 'Loan not found', 404);
    }

    if (loan.status === 'cancelled') {
      return failure(res, 'Loan is already cancelled', 409);
    }

    if (loan.status === 'paid_off') {
      return failure(res, 'Paid off loans cannot be cancelled', 409);
    }

    await loan.update({
      status: 'cancelled',
      nextDueDate: null
    });

    broadcastRealtimeEvent('loan.cancelled', ['loans', 'devices', 'customers', 'payments'], {
      loanId: loan.id,
      deviceId: loan.deviceId,
      customerId: loan.customerId
    });

    return success(res, 'Loan cancelled successfully', loan);
  } catch (error) {
    return next(error);
  }
}

async function getLoans(req, res, next) {
  try {
    const loans = await Loan.findAll({
      include: [
        { model: Customer, as: 'customer' },
        { model: Device, as: 'device' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Loans fetched successfully', loans.map(function mapLoan(loan) {
      return {
        ...loan.toJSON(),
        display: {
          principalAmount: formatAmount(loan.principalAmount),
          downPayment: formatAmount(loan.downPayment),
          monthlyPayment: formatAmount(loan.monthlyPayment),
          totalPayable: formatAmount(loan.totalPayable),
          amountPaid: formatAmount(loan.amountPaid),
          amountRemaining: formatAmount(Math.max(normalizeAmountInt(loan.totalPayable) - normalizeAmountInt(loan.amountPaid), 0))
        }
      };
    }));
  } catch (error) {
    return next(error);
  }
}

async function getLoanById(req, res, next) {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Device, as: 'device' },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!loan) {
      return failure(res, 'Loan not found', 404);
    }

    return success(res, 'Loan fetched successfully', {
      loan,
      health: await calculateLoanHealth(loan.id)
    });
  } catch (error) {
    return next(error);
  }
}

async function getLoanSchedule(req, res, next) {
  try {
    const loan = await Loan.findByPk(req.params.id);

    if (!loan) {
      return failure(res, 'Loan not found', 404);
    }

    return success(res, 'Loan schedule generated successfully', generateRepaymentSchedule(loan));
  } catch (error) {
    return next(error);
  }
}

async function getLoanPayments(req, res, next) {
  try {
    const payments = await Payment.findAll({
      where: {
        loanId: req.params.id
      },
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Loan payments fetched successfully', payments);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createLoan,
  cancelLoan,
  getLoans,
  getLoanById,
  getLoanSchedule,
  getLoanPayments
};
