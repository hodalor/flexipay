const schedule = require('node-schedule');
const { Loan, Device } = require('@models');
const { checkAndEnforceOverdueLoans } = require('@services/loan.service');
const {
  notifyDeviceLocked,
  notifyPaymentDue
} = require('@services/notification.service');
const logger = require('@utils/logger');

const schedulerJobs = {};

function diffInDays(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Executes daily overdue enforcement in the Africa/Lusaka timezone.
 *
 * @returns {Promise<{ locked: Array<object>, warned: Array<object> }>}
 */
async function dailyEnforcementJob() {
  const enforcement = await checkAndEnforceOverdueLoans();
  const loans = await Loan.findAll({
    where: {
      status: 'active'
    }
  });

  for (const loan of loans) {
    if (!loan.nextDueDate) {
      continue;
    }

    const daysUntilDue = diffInDays(loan.nextDueDate);

    if (daysUntilDue === 3) {
      await notifyPaymentDue(loan.customerId, loan.id, daysUntilDue);
    }
  }

  for (const lockedLoan of enforcement.locked) {
    await notifyDeviceLocked(lockedLoan.customerId, lockedLoan.deviceId);
  }

  logger.info('Daily enforcement job completed', {
    locked: enforcement.locked.length,
    warned: enforcement.warned.length
  });

  return enforcement;
}

/**
 * Sends upcoming payment reminders.
 *
 * @returns {Promise<number>}
 */
async function paymentReminderJob() {
  const loans = await Loan.findAll({
    where: {
      status: 'active'
    }
  });

  let notified = 0;

  for (const loan of loans) {
    if (!loan.nextDueDate) {
      continue;
    }

    const daysUntilDue = diffInDays(loan.nextDueDate);

    if (daysUntilDue === 3) {
      const result = await notifyPaymentDue(loan.customerId, loan.id, daysUntilDue);

      if (result.success) {
        notified += 1;
      }
    }
  }

  logger.info('Payment reminder job completed', {
    notified
  });

  return notified;
}

/**
 * Logs a weekly collections and enforcement report.
 *
 * @returns {Promise<object>}
 */
async function weeklyReportJob() {
  const [activeLoans, defaultedLoans, paidOffLoans, lockedDevices, activeLoanRows] = await Promise.all([
    Loan.count({ where: { status: 'active' } }),
    Loan.count({ where: { status: 'defaulted' } }),
    Loan.count({ where: { status: 'paid_off' } }),
    Device.count({ where: { isLocked: true } }),
    Loan.findAll({ where: { status: 'active' }, attributes: ['nextDueDate'] })
  ]);
  const overdueLoans = activeLoanRows.filter(function filterOverdue(loan) {
    return loan.nextDueDate && new Date(loan.nextDueDate) < new Date();
  }).length;

  const report = {
    activeLoans,
    overdueLoans,
    defaultedLoans,
    paidOffLoans,
    lockedDevices
  };

  logger.info('Weekly portfolio report', report);
  return report;
}

function buildRule(hour, minute, dayOfWeek) {
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'Africa/Lusaka';
  rule.hour = hour;
  rule.minute = minute;

  if (typeof dayOfWeek === 'number') {
    rule.dayOfWeek = dayOfWeek;
  }

  return rule;
}

/**
 * Registers all recurring background jobs.
 *
 * @returns {void}
 */
function startScheduler() {
  schedulerJobs.dailyEnforcementJob = schedule.scheduleJob(
    buildRule(8, 0),
    function runDailyEnforcement() {
      dailyEnforcementJob().catch(function onError(error) {
        logger.error('Daily enforcement job failed', {
          error: error.message
        });
      });
    }
  );

  schedulerJobs.paymentReminderJob = schedule.scheduleJob(
    buildRule(9, 0),
    function runPaymentReminder() {
      paymentReminderJob().catch(function onError(error) {
        logger.error('Payment reminder job failed', {
          error: error.message
        });
      });
    }
  );

  schedulerJobs.weeklyReportJob = schedule.scheduleJob(
    buildRule(7, 0, 1),
    function runWeeklyReport() {
      weeklyReportJob().catch(function onError(error) {
        logger.error('Weekly report job failed', {
          error: error.message
        });
      });
    }
  );

  logger.info('Scheduler registered', {
    jobs: Object.keys(schedulerJobs)
  });
}

module.exports = {
  startScheduler,
  dailyEnforcementJob,
  paymentReminderJob,
  weeklyReportJob
};
