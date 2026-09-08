const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logDirectory = path.resolve(__dirname, '../../logs');
fs.mkdirSync(logDirectory, { recursive: true });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'flexipay-backend'
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.resolve(logDirectory, 'backend.log'),
      handleExceptions: true
    })
  ]
});

module.exports = logger;
