const jwt = require('jsonwebtoken');
const { failure } = require('@utils/response');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return failure(res, 'Authentication token is required', 401);
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return failure(res, 'Invalid or expired authentication token', 401, error.message);
  }
};

