const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const Store = require('electron-store');
const logger = require('@main/logger');

const store = new Store({
  name: 'flexipay-desktop'
});

function getPlatformType() {
  return process.platform === 'darwin' ? 'mac' : 'windows';
}

function getBrandName() {
  return process.platform === 'darwin' ? 'Apple' : 'Windows PC';
}

function getModelName() {
  return os.hostname();
}

function getInstallationId() {
  let installationId = store.get('installationId');

  if (!installationId) {
    installationId = 'FXP-DESKTOP-' + crypto.randomUUID();
    store.set('installationId', installationId);
  }

  return installationId;
}

function normalizeBackendUrl(rawUrl) {
  const defaultUrl = process.env.BACKEND_URL || 'http://localhost:4000/api';
  const base = String(rawUrl || store.get('backendUrl') || defaultUrl).trim().replace(/\/+$/, '');

  if (base.endsWith('/api')) {
    return base;
  }

  return base + '/api';
}

function getEnrollmentState() {
  return {
    isEnrolled: Boolean(store.get('deviceId') && store.get('deviceToken')),
    backendUrl: normalizeBackendUrl(store.get('backendUrl')),
    deviceId: store.get('deviceId') || null,
    installationId: getInstallationId(),
    platformType: getPlatformType(),
    deviceName: getModelName(),
    customer: store.get('customerProfile') || null
  };
}

async function enrollDesktopDevice(payload) {
  try {
    const backendUrl = normalizeBackendUrl(payload.backendUrl);
    const loginResponse = await axios.post(backendUrl + '/auth/login', {
      identifier: payload.identifier,
      password: payload.password
    });
    const session = loginResponse.data.data;
    const installationId = getInstallationId();

    const enrollResponse = await axios.post(backendUrl + '/devices/enroll', {
      customerId: session.customer.id,
      type: getPlatformType(),
      brand: payload.brand || getBrandName(),
      model: payload.model || getModelName(),
      serialNumber: installationId,
      mdmEnrollmentId: installationId
    }, {
      headers: {
        Authorization: 'Bearer ' + session.accessToken
      }
    });

    const enrollment = enrollResponse.data.data;
    store.set('backendUrl', backendUrl);
    store.set('deviceId', enrollment.device.id);
    store.set('deviceToken', enrollment.deviceToken);
    store.set('customerProfile', {
      id: session.customer.id,
      fullName: session.customer.fullName,
      email: session.customer.email,
      phone: session.customer.phone
    });
    store.set('deviceState', {
      isLocked: Boolean(enrollment.device.isLocked),
      customerName: session.customer.fullName
    });

    logger.info('Desktop device enrolled successfully', {
      deviceId: enrollment.device.id,
      customerId: session.customer.id
    });

    return {
      ...getEnrollmentState(),
      deviceToken: enrollment.deviceToken
    };
  } catch (error) {
    logger.warn('Desktop device enrollment failed', {
      error: error.response?.data || error.message
    });
    throw new Error(error.response?.data?.message || error.message || 'Unable to enroll desktop device');
  }
}

module.exports = {
  enrollDesktopDevice,
  getEnrollmentState,
  normalizeBackendUrl
};
