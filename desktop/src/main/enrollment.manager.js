const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('@main/logger');
const { resolveHardwareSerialNumber, resolveStableMachineFingerprint } = require('@main/device.identity');
const { store, setValue, setValues } = require('@main/state.store');

function getPlatformType() {
  if (process.platform === 'darwin') {
    return 'mac';
  }

  if (process.platform === 'linux') {
    return 'linux';
  }

  return 'windows';
}

function getBrandName() {
  if (process.platform === 'darwin') {
    return 'Apple';
  }

  if (process.platform === 'linux') {
    return 'Linux PC';
  }

  return 'Windows PC';
}

function getModelName() {
  return os.hostname();
}

async function getInstallationId() {
  let installationId = store.get('installationId');

  if (!installationId) {
    const stableMachineFingerprint = await resolveStableMachineFingerprint();
    const fingerprintSource = stableMachineFingerprint || os.hostname() + '-' + crypto.createHash('sha256').update(os.arch()).digest('hex');
    installationId = 'FXP-DESKTOP-' + crypto.createHash('sha256').update(String(fingerprintSource)).digest('hex').slice(0, 24).toUpperCase();
    setValue('installationId', installationId);
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

async function getEnrollmentState() {
  return {
    isEnrolled: Boolean(store.get('deviceId') && store.get('deviceToken')),
    backendUrl: normalizeBackendUrl(store.get('backendUrl')),
    deviceId: store.get('deviceId') || null,
    serialNumber: store.get('serialNumber') || null,
    installationId: await getInstallationId(),
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
    const installationId = await getInstallationId();
    const detectedSerialNumber = await resolveHardwareSerialNumber();
    const serialNumber = payload.serialNumber || detectedSerialNumber || installationId;

    const enrollResponse = await axios.post(backendUrl + '/devices/enroll', {
      customerId: session.customer.id,
      type: getPlatformType(),
      brand: payload.brand || getBrandName(),
      model: payload.model || getModelName(),
      serialNumber,
      mdmEnrollmentId: installationId
    }, {
      headers: {
        Authorization: 'Bearer ' + session.accessToken
      }
    });

    const enrollment = enrollResponse.data.data;
    setValues({
      backendUrl,
      deviceId: enrollment.device.id,
      deviceToken: enrollment.deviceToken,
      serialNumber: enrollment.device.serialNumber || serialNumber,
      customerProfile: {
        id: session.customer.id,
        fullName: session.customer.fullName,
        email: session.customer.email,
        phone: session.customer.phone
      },
      deviceState: {
        isLocked: Boolean(enrollment.device.isLocked),
        customerName: session.customer.fullName
      }
    });

    logger.info('Desktop device enrolled successfully', {
      deviceId: enrollment.device.id,
      customerId: session.customer.id,
      serialNumber
    });

    return {
      ...(await getEnrollmentState()),
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
