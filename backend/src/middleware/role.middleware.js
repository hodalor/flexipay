const { failure } = require('@utils/response');

function allowRoles() {
  const roles = Array.from(arguments);

  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return failure(res, 'You do not have permission to perform this action', 403);
    }

    return next();
  };
}

module.exports = {
  allowRoles
};

