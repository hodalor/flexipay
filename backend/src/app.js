const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('@routes');
const errorMiddleware = require('@middleware/error.middleware');
const logger = require('@utils/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
}));
app.use(morgan('combined', {
  stream: {
    write: function write(message) {
      logger.info(message.trim());
    }
  }
}));

app.get('/health', function healthHandler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'FlexiPay backend is healthy'
  });
});

app.use('/api', routes);

app.use(function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

app.use(errorMiddleware);

module.exports = app;
