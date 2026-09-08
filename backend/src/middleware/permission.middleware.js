const { failure } = require('@utils/response');
const { hasAction } = require('@config/permissions');

function allowActions() {
  const actions = Array.from(arguments);

  return function permissionMiddleware(req, res, next) {
    if (!req.user || req.user.userType !== 'admin') {
      return failure(res, 'Admin authentication is required', 403);
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const allowed = actions.some(function someAction(action) {
      return hasAction(req.user.permissions, action);
    });

    if (!allowed) {
      return failure(res, 'You do not have permission to perform this action', 403);
    }

    return next();
  };
}

module.exports = {
  allowActions
};
