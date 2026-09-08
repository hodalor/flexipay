const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { AdminUser, Customer } = require('@models');
const { resolvePermissions } = require('@config/permissions');
const { success, failure } = require('@utils/response');
const { broadcastRealtimeEvent } = require('@services/realtime.service');
const {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword
} = require('@utils/crypto');

function sanitizeCustomer(customer) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    nationalId: customer.nationalId,
    status: customer.status
  };
}

function sanitizeAdminUser(adminUser) {
  const permissions = resolvePermissions(adminUser.role, adminUser.permissions);

  return {
    id: adminUser.id,
    fullName: adminUser.fullName,
    email: adminUser.email,
    role: adminUser.role,
    status: adminUser.status,
    permissions
  };
}

function adminSessionPayload(adminUser) {
  const permissions = resolvePermissions(adminUser.role, adminUser.permissions);

  return {
    sub: adminUser.id,
    adminUserId: adminUser.id,
    role: adminUser.role,
    userType: 'admin',
    permissions
  };
}

function customerSessionPayload(customer) {
  return {
    sub: customer.id,
    customerId: customer.id,
    role: 'customer',
    userType: 'customer'
  };
}

async function register(req, res, next) {
  try {
    const existingCustomer = await Customer.findOne({
      where: {
        [Op.or]: [
          { email: req.body.email },
          { phone: req.body.phone }
        ]
      }
    });

    if (existingCustomer) {
      return failure(res, 'A customer with this email or phone already exists', 409);
    }

    const passwordHash = await hashPassword(req.body.password);
    const customer = await Customer.create({
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      nationalId: req.body.nationalId,
      passwordHash,
      status: 'active'
    });

    const payload = customerSessionPayload(customer);

    broadcastRealtimeEvent('customer.created', ['customers'], {
      customerId: customer.id,
      fullName: customer.fullName
    });

    return success(res, 'Registration successful', {
      userType: 'customer',
      customer: sanitizeCustomer(customer),
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    }, 201);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const adminUser = await AdminUser.findOne({
      where: {
        email: String(req.body.identifier || '').toLowerCase()
      }
    });

    if (adminUser) {
      const validAdminPassword = await comparePassword(req.body.password, adminUser.passwordHash);

      if (!validAdminPassword || adminUser.status !== 'active') {
        return failure(res, 'Invalid credentials', 401);
      }

      const payload = adminSessionPayload(adminUser);

      return success(res, 'Login successful', {
        userType: 'admin',
        user: sanitizeAdminUser(adminUser),
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
      });
    }

    const customer = await Customer.findOne({
      where: {
        [Op.or]: [
          { email: req.body.identifier },
          { phone: req.body.identifier }
        ]
      }
    });

    if (!customer) {
      return failure(res, 'Invalid credentials', 401);
    }

    const validPassword = await comparePassword(req.body.password, customer.passwordHash);

    if (!validPassword || customer.status !== 'active') {
      return failure(res, 'Invalid credentials', 401);
    }

    const payload = customerSessionPayload(customer);

    return success(res, 'Login successful', {
      userType: 'customer',
      customer: sanitizeCustomer(customer),
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return failure(res, 'Refresh token is required', 400);
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.sub !== req.user.sub) {
      return failure(res, 'Refresh token subject mismatch', 403);
    }

    if (decoded.userType === 'admin') {
      const adminUser = await AdminUser.findByPk(decoded.sub);

      if (!adminUser || adminUser.status !== 'active') {
        return failure(res, 'Admin user not found', 404);
      }

      const payload = adminSessionPayload(adminUser);

      return success(res, 'Token refreshed', {
        userType: 'admin',
        user: sanitizeAdminUser(adminUser),
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
      });
    }

    const customer = await Customer.findByPk(decoded.sub);

    if (!customer) {
      return failure(res, 'Customer not found', 404);
    }

    const payload = customerSessionPayload(customer);

    return success(res, 'Token refreshed', {
      userType: 'customer',
      customer: sanitizeCustomer(customer),
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refresh
};
