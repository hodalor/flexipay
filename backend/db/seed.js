const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

require('../src/register-aliases');

const { AdminUser, Customer, Device, Loan, sequelize } = require('@models');
const { resolvePermissions } = require('@config/permissions');
const { hashPassword } = require('@utils/crypto');
const logger = require('@utils/logger');
const { toAmountInt } = require('@utils/money');
const { calculateMonthlyPayment } = require('@services/loan.service');

async function createLoanFor(customer, device, principalAmount, downPayment, rate, termMonths, offsetMonths) {
  const financedAmount = principalAmount - downPayment;
  const paymentTerms = calculateMonthlyPayment(financedAmount, rate, termMonths);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - offsetMonths);
  const nextDueDate = new Date(startDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + offsetMonths + 1);

  return Loan.create({
    customerId: customer.id,
    deviceId: device.id,
    principalAmount,
    downPayment,
    interestRate: rate,
    termMonths,
    monthlyPayment: paymentTerms.monthlyPayment,
    totalPayable: paymentTerms.totalPayable,
    amountPaid: paymentTerms.monthlyPayment * offsetMonths,
    status: 'active',
    nextDueDate,
    gracePeriodDays: 5,
    startDate
  });
}

async function seed() {
  try {
    await sequelize.sync({ force: true });
    const customerPasswordHash = await hashPassword('Password123!');
    const superAdminPasswordHash = await hashPassword('FlexiPayAdmin123!');

    const customers = await Customer.bulkCreate([
      {
        fullName: 'Amina Yusuf',
        phone: '+254700000001',
        email: 'amina@example.com',
        nationalId: 'ID-1001',
        passwordHash: customerPasswordHash,
        status: 'active'
      },
      {
        fullName: 'David Kamau',
        phone: '+254700000002',
        email: 'david@example.com',
        nationalId: 'ID-1002',
        passwordHash: customerPasswordHash,
        status: 'active'
      },
      {
        fullName: 'Lebo Dlamini',
        phone: '+278200000003',
        email: 'lebo@example.com',
        nationalId: 'ID-1003',
        passwordHash: customerPasswordHash,
        status: 'active'
      }
    ], { returning: true });

    const devices = await Device.bulkCreate([
      {
        customerId: customers[0].id,
        type: 'android',
        brand: 'Samsung',
        model: 'Galaxy A55',
        serialNumber: 'FXP-ANDROID-001',
        imei: '356000000000001',
        mdmEnrollmentId: 'MDM-ANDROID-001',
        fcmToken: 'sample-fcm-1',
        isLocked: false,
        enrolledAt: new Date()
      },
      {
        customerId: customers[1].id,
        type: 'windows',
        brand: 'Lenovo',
        model: 'ThinkPad E14',
        serialNumber: 'FXP-WINDOWS-001',
        imei: null,
        mdmEnrollmentId: 'MDM-WINDOWS-001',
        fcmToken: null,
        isLocked: false,
        enrolledAt: new Date()
      },
      {
        customerId: customers[2].id,
        type: 'ios',
        brand: 'Apple',
        model: 'iPhone 15',
        serialNumber: 'FXP-IOS-001',
        imei: '356000000000003',
        mdmEnrollmentId: 'MDM-IOS-001',
        apnsToken: 'sample-apns-1',
        isLocked: false,
        enrolledAt: new Date()
      }
    ], { returning: true });

    await createLoanFor(customers[0], devices[0], toAmountInt(650), toAmountInt(50), 12, 12, 2);
    await createLoanFor(customers[1], devices[1], toAmountInt(900), toAmountInt(100), 10, 18, 3);
    await createLoanFor(customers[2], devices[2], toAmountInt(1200), toAmountInt(200), 8, 12, 1);

    await AdminUser.create({
      fullName: 'FlexiPay Super Admin',
      email: 'superadmin@flexipay.local',
      passwordHash: superAdminPasswordHash,
      role: 'super_admin',
      status: 'active',
      permissions: resolvePermissions('super_admin')
    });

    logger.info('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed', {
      error: error.message
    });
    process.exit(1);
  }
}

seed();
