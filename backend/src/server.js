const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

require('./register-aliases');

const app = require('@src/app');
const logger = require('@utils/logger');
const { sequelize } = require('@models');
const { ensureDeviceCodeColumn } = require('@src/scripts/ensure-device-code-column');
const { connectRedis } = require('@config/redis');
const { startScheduler } = require('@services/scheduler.service');

const port = Number(process.env.PORT || 4000);

async function bootstrap() {
  try {
    await sequelize.authenticate();
    await ensureDeviceCodeColumn(sequelize);
    await sequelize.sync({ alter: true });
    logger.info('Database connection established and schema synchronized');
    await connectRedis();
    startScheduler();

    app.listen(port, function onListen() {
      logger.info('FlexiPay backend started', {
        port
      });
    });
  } catch (error) {
    logger.error('Backend bootstrap failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

bootstrap();
