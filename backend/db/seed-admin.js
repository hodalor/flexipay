const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

require('../src/register-aliases');

const { AdminUser, Customer, sequelize } = require('@models');
const { resolvePermissions } = require('@config/permissions');
const { hashPassword } = require('@utils/crypto');
const logger = require('@utils/logger');

const ADMIN_EMAIL = 'superadmin@flexipay.local';
const ADMIN_NAME = 'FlexiPay Super Admin';
const ADMIN_PASSWORD = 'FlexiPayAdmin123!';

async function seedAdmin() {
  try {
    await sequelize.sync();

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const existingAdmin = await AdminUser.findOne({
      where: {
        email: ADMIN_EMAIL
      }
    });

    if (existingAdmin) {
      await existingAdmin.update({
        fullName: ADMIN_NAME,
        passwordHash,
        status: 'active',
        role: 'super_admin',
        permissions: resolvePermissions('super_admin')
      });

      logger.info('Super admin account updated', {
        email: ADMIN_EMAIL
      });
    } else {
      await AdminUser.create({
        fullName: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'super_admin',
        status: 'active',
        permissions: resolvePermissions('super_admin')
      });

      logger.info('Super admin account created', {
        email: ADMIN_EMAIL
      });
    }

    await Customer.destroy({
      where: {
        email: ADMIN_EMAIL
      }
    });

    process.exit(0);
  } catch (error) {
    logger.error('Super admin seeding failed', {
      error: error.message
    });
    process.exit(1);
  }
}

seedAdmin();
