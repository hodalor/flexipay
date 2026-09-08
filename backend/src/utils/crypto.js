const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d'
  });
}

function generateDeviceToken(device) {
  return generateAccessToken({
    sub: device.id,
    deviceId: device.id,
    customerId: device.customerId,
    role: 'device'
  });
}

function generateReference(prefix) {
  return (prefix || 'FXP') + '-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateDeviceToken,
  generateReference,
  hashPassword,
  comparePassword
};

