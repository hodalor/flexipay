const { AdminUser } = require('@models');
const { resolvePermissions } = require('@config/permissions');
const { hashPassword } = require('@utils/crypto');
const { failure, success } = require('@utils/response');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

function sanitizeAdminUser(adminUser) {
  return {
    id: adminUser.id,
    fullName: adminUser.fullName,
    email: adminUser.email,
    role: adminUser.role,
    status: adminUser.status,
    permissions: resolvePermissions(adminUser.role, adminUser.permissions),
    createdAt: adminUser.createdAt,
    updatedAt: adminUser.updatedAt
  };
}

async function listAdminUsers(req, res, next) {
  try {
    const users = await AdminUser.findAll({
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Admin users fetched successfully', users.map(sanitizeAdminUser));
  } catch (error) {
    return next(error);
  }
}

async function createAdminUser(req, res, next) {
  try {
    if (!req.body.fullName || !req.body.email || !req.body.password || !req.body.role) {
      return failure(res, 'fullName, email, password, and role are required', 400);
    }

    const existingUser = await AdminUser.findOne({
      where: {
        email: String(req.body.email).toLowerCase()
      }
    });

    if (existingUser) {
      return failure(res, 'An admin user with this email already exists', 409);
    }

    const passwordHash = await hashPassword(req.body.password);
    const adminUser = await AdminUser.create({
      fullName: req.body.fullName,
      email: String(req.body.email).toLowerCase(),
      passwordHash,
      role: req.body.role,
      status: req.body.status || 'active',
      permissions: resolvePermissions(req.body.role, req.body.permissions)
    });

    broadcastRealtimeEvent('admin_user.created', ['admin'], {
      adminUserId: adminUser.id
    });

    return success(res, 'Admin user created successfully', sanitizeAdminUser(adminUser), 201);
  } catch (error) {
    return next(error);
  }
}

async function updateAdminUser(req, res, next) {
  try {
    const adminUser = await AdminUser.findByPk(req.params.id);

    if (!adminUser) {
      return failure(res, 'Admin user not found', 404);
    }

    const updates = {};

    if (req.body.fullName) {
      updates.fullName = req.body.fullName;
    }

    if (req.body.email) {
      updates.email = String(req.body.email).toLowerCase();
    }

    if (req.body.role) {
      updates.role = req.body.role;
      updates.permissions = resolvePermissions(req.body.role, req.body.permissions || adminUser.permissions);
    } else if (req.body.permissions) {
      updates.permissions = resolvePermissions(adminUser.role, req.body.permissions);
    }

    if (req.body.status) {
      updates.status = req.body.status;
    }

    if (req.body.password) {
      updates.passwordHash = await hashPassword(req.body.password);
    }

    await adminUser.update(updates);

    broadcastRealtimeEvent('admin_user.updated', ['admin'], {
      adminUserId: adminUser.id
    });

    return success(res, 'Admin user updated successfully', sanitizeAdminUser(adminUser));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAdminUser,
  listAdminUsers,
  updateAdminUser
};
