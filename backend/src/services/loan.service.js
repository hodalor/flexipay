const { Loan, Payment, Device, Customer } = require('@models');
const logger = require('@utils/logger');
const { formatAmount, normalizeAmountInt } = require('@utils/money');

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function daysBetween(leftDate, rightDate) {
  const diffMs = leftDate.getTime() - rightDate.getTime();
  return Math.floor(diffMs / 86400000);
}

function serializeScheduleRow(row) {
  return {
    installmentNo: row.installmentNo,
    dueDate: row.dueDate,
    openingBalance: row.openingBalance,
    principal: row.principal,
    interest: row.interest,
    monthlyPayment: row.monthlyPayment,
    closingBalance: row.closingBalance,
    display: {
      openingBalance: formatAmount(row.openingBalance),
      principal: formatAmount(row.principal),
      interest: formatAmount(row.interest),
      monthlyPayment: formatAmount(row.monthlyPayment),
      closingBalance: formatAmount(row.closingBalance)
    }
  };
}

/**
 * Calculates a reducing-balance amortized repayment value in ngwee.
 *
 * @param {number|string} principal
 * @param {number|string} rate
 * @param {number|string} months
 * @returns {{ monthlyPayment: number, totalPayable: number, totalInterest: number }}
 * @throws {Error}
 */
function calculateMonthlyPayment(principal, rate, months) {
  const principalAmount = normalizeAmountInt(principal);
  const monthlyRate = Number(rate) / 100 / 12;
  const totalMonths = Number(months);

  if (!principalAmount || principalAmount <= 0) {
    throw new Error('Principal must be greater than zero');
  }

  if (!Number.isInteger(totalMonths) || totalMonths <= 0) {
    throw new Error('Loan term must be greater than zero');
  }

  if (monthlyRate === 0) {
    const flatPayment = Math.round(principalAmount / totalMonths);
    return {
      monthlyPayment: flatPayment,
      totalPayable: flatPayment * totalMonths,
      totalInterest: (flatPayment * totalMonths) - principalAmount
    };
  }

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPayment = Math.round(principalAmount * ((monthlyRate * factor) / (factor - 1)));
  const totalPayable = monthlyPayment * totalMonths;

  return {
    monthlyPayment,
    totalPayable,
    totalInterest: totalPayable - principalAmount
  };
}

/**
 * Builds an amortization schedule in ngwee for a persisted or in-memory loan.
 *
 * @param {object} loan
 * @returns {Array<object>}
 * @throws {Error}
 */
function generateRepaymentSchedule(loan) {
  const totalMonths = Number(loan.termMonths);
  const financedPrincipal = normalizeAmountInt(loan.principalAmount) - normalizeAmountInt(loan.downPayment);
  const calculation = loan.monthlyPayment
    ? {
        monthlyPayment: normalizeAmountInt(loan.monthlyPayment),
        totalPayable: normalizeAmountInt(loan.totalPayable)
      }
    : calculateMonthlyPayment(financedPrincipal, loan.interestRate, totalMonths);
  const monthlyRate = Number(loan.interestRate) / 100 / 12;
  const schedule = [];
  let openingBalance = financedPrincipal;

  for (let installmentNo = 1; installmentNo <= totalMonths; installmentNo += 1) {
    const interest = monthlyRate === 0 ? 0 : Math.round(openingBalance * monthlyRate);
    const preferredPayment = calculation.monthlyPayment;
    const principalComponent = Math.min(preferredPayment - interest, openingBalance);
    const monthlyPayment = installmentNo === totalMonths
      ? Math.max(openingBalance + interest, 0)
      : Math.max(preferredPayment, 0);
    const effectivePrincipal = Math.min(monthlyPayment - interest, openingBalance);
    const closingBalance = Math.max(openingBalance - effectivePrincipal, 0);

    schedule.push(serializeScheduleRow({
      installmentNo,
      dueDate: addMonths(new Date(loan.startDate), installmentNo),
      openingBalance,
      principal: principalComponent > 0 ? principalComponent : effectivePrincipal,
      interest,
      monthlyPayment,
      closingBalance
    }));

    openingBalance = closingBalance;
  }

  return schedule;
}

/**
 * Finds overdue loans, locks devices after the grace window, and marks
 * long-delinquent loans as defaulted.
 *
 * @returns {Promise<{ locked: Array<object>, warned: Array<object> }>}
 * @throws {Error}
 */
async function checkAndEnforceOverdueLoans() {
  const { lockDevice } = require('@services/mdm.service');

  const loans = await Loan.findAll({
    where: {
      status: 'active'
    },
    include: [
      { model: Device, as: 'device' },
      { model: Customer, as: 'customer' }
    ],
    order: [['nextDueDate', 'ASC']]
  });

  const results = {
    locked: [],
    warned: []
  };
  const now = new Date();

  for (const loan of loans) {
    if (!loan.nextDueDate || !loan.device) {
      continue;
    }

    const dueDate = new Date(loan.nextDueDate);
    const graceBoundary = addMonths(new Date(dueDate), 0);
    graceBoundary.setDate(graceBoundary.getDate() + Number(loan.gracePeriodDays || 0));
    const daysOverdue = daysBetween(now, dueDate);
    const daysPastGrace = daysBetween(now, graceBoundary);

    const loanSummary = {
      loanId: loan.id,
      deviceId: loan.deviceId,
      customerId: loan.customerId,
      daysOverdue,
      daysPastGrace: Math.max(daysPastGrace, 0),
      amountDue: Math.max(normalizeAmountInt(loan.totalPayable) - normalizeAmountInt(loan.amountPaid), 0)
    };

    if (daysOverdue > 0 && daysPastGrace <= 0) {
      results.warned.push(loanSummary);
      continue;
    }

    if (daysPastGrace > 0) {
      const reason = 'Loan overdue past grace period by ' + daysPastGrace + ' day(s)';
      const response = await lockDevice(loan.deviceId, reason, 'scheduler');

      if (daysOverdue > 90) {
        await loan.update({
          status: 'defaulted'
        });
      }

      results.locked.push({
        ...loanSummary,
        commandId: response.commandId,
        success: response.success
      });
    }
  }

  logger.info('Overdue loan enforcement completed', {
    warned: results.warned.length,
    locked: results.locked.length
  });

  return results;
}

/**
 * Applies a successful payment to the loan and updates the enforcement state.
 *
 * @param {string} paymentId
 * @returns {Promise<object>}
 * @throws {Error}
 */
async function processSuccessfulPayment(paymentId) {
  const { unlockDevice } = require('@services/mdm.service');
  const { notifyPaymentReceived } = require('@services/notification.service');

  const payment = await Payment.findOne({
    where: {
      id: paymentId
    }
  }) || await Payment.findOne({
    where: {
      reference: paymentId
    }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  const loan = await Loan.findByPk(payment.loanId, {
    include: [
      { model: Device, as: 'device' },
      { model: Customer, as: 'customer' },
      { model: Payment, as: 'payments' }
    ]
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (payment.status === 'success') {
    return loan;
  }

  if (payment.status !== 'success') {
    await payment.update({
      status: 'success',
      paidAt: payment.paidAt || new Date(),
      approvalStatus: payment.approvalStatus === 'gateway_pending' ? 'completed' : payment.approvalStatus,
      completedAt: payment.completedAt || new Date()
    });
  }

  const updatedAmountPaid = normalizeAmountInt(loan.amountPaid) + normalizeAmountInt(payment.amount);
  const loanUpdates = {
    amountPaid: updatedAmountPaid,
    nextDueDate: loan.nextDueDate ? addMonths(new Date(loan.nextDueDate), 1) : addMonths(new Date(), 1),
    status: 'active'
  };

  if (updatedAmountPaid >= normalizeAmountInt(loan.totalPayable)) {
    loanUpdates.status = 'paid_off';
    loanUpdates.nextDueDate = null;
  }

  await loan.update(loanUpdates);

  if (loanUpdates.status === 'paid_off' || (loan.device && loan.device.isLocked)) {
    await unlockDevice(loan.deviceId, 'payment-service');
  }

  await notifyPaymentReceived(loan.customerId, normalizeAmountInt(payment.amount), loan.id);

  return Loan.findByPk(loan.id, {
    include: [
      { model: Device, as: 'device' },
      { model: Customer, as: 'customer' },
      { model: Payment, as: 'payments' }
    ]
  });
}

/**
 * Summarizes a loan and its amortization state for dashboards and APIs.
 *
 * @param {string} loanId
 * @returns {Promise<object>}
 * @throws {Error}
 */
async function calculateLoanHealth(loanId) {
  const loan = await Loan.findByPk(loanId, {
    include: [{ model: Payment, as: 'payments' }]
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  const paid = normalizeAmountInt(loan.amountPaid);
  const remaining = Math.max(normalizeAmountInt(loan.totalPayable) - paid, 0);

  return {
    loanId: loan.id,
    paid,
    remaining,
    display: {
      paid: formatAmount(paid),
      remaining: formatAmount(remaining)
    },
    schedule: generateRepaymentSchedule(loan)
  };
}

module.exports = {
  calculateMonthlyPayment,
  generateRepaymentSchedule,
  checkAndEnforceOverdueLoans,
  checkOverdueLoans: checkAndEnforceOverdueLoans,
  processSuccessfulPayment,
  calculateLoanHealth
};
