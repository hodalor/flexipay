const sequelize = require('@config/database');
const createCustomer = require('@models/Customer');
const createAdminUser = require('@models/AdminUser');
const createDevice = require('@models/Device');
const createLoan = require('@models/Loan');
const createPayment = require('@models/Payment');
const createDeviceCommand = require('@models/DeviceCommand');

const Customer = createCustomer(sequelize);
const AdminUser = createAdminUser(sequelize);
const Device = createDevice(sequelize);
const Loan = createLoan(sequelize);
const Payment = createPayment(sequelize);
const DeviceCommand = createDeviceCommand(sequelize);

Customer.hasMany(Device, { foreignKey: 'customerId', as: 'devices', onDelete: 'CASCADE' });
Device.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Loan, { foreignKey: 'customerId', as: 'loans', onDelete: 'CASCADE' });
Loan.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Device.hasMany(Loan, { foreignKey: 'deviceId', as: 'loans', onDelete: 'CASCADE' });
Loan.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

Loan.hasMany(Payment, { foreignKey: 'loanId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Loan, { foreignKey: 'loanId', as: 'loan' });

Customer.hasMany(Payment, { foreignKey: 'customerId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

AdminUser.hasMany(Payment, { foreignKey: 'initiatedByAdminUserId', as: 'initiatedPayments' });
Payment.belongsTo(AdminUser, { foreignKey: 'initiatedByAdminUserId', as: 'initiator' });

AdminUser.hasMany(Payment, { foreignKey: 'directorApproverId', as: 'directorApprovedPayments' });
Payment.belongsTo(AdminUser, { foreignKey: 'directorApproverId', as: 'directorApprover' });

AdminUser.hasMany(Payment, { foreignKey: 'managerApproverId', as: 'managerApprovedPayments' });
Payment.belongsTo(AdminUser, { foreignKey: 'managerApproverId', as: 'managerApprover' });

Device.hasMany(DeviceCommand, { foreignKey: 'deviceId', as: 'commands', onDelete: 'CASCADE' });
DeviceCommand.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

module.exports = {
  sequelize,
  Customer,
  AdminUser,
  Device,
  Loan,
  Payment,
  DeviceCommand
};
