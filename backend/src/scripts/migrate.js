const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

require('../register-aliases');

const logger = require('@utils/logger');
const { sequelize } = require('@models');
const { ensureDeviceCodeColumn } = require('@src/scripts/ensure-device-code-column');

async function migrate() {
  try {
    await sequelize.authenticate();
    await ensureDeviceCodeColumn(sequelize);
    await sequelize.sync({ alter: true });
    logger.info('Database migration completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', {
      error: error.message
    });
    process.exit(1);
  }
}

migrate();
