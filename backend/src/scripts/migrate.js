const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

require('../register-aliases');

const logger = require('@utils/logger');
const { sequelize } = require('@models');

async function migrate() {
  try {
    await sequelize.authenticate();
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
