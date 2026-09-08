const logger = require('@utils/logger');
const { failure } = require('@utils/response');

module.exports = function errorMiddleware(error, req, res, next) {
  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack
  });

  if (res.headersSent) {
    return next(error);
  }

  return failure(res, error.message || 'Internal server error', error.statusCode || 500);
};

