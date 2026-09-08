const axios = require('axios');
const apn = require('apn');
const { GoogleAuth } = require('google-auth-library');
const { Device, DeviceCommand } = require('@models');
const mdmConfig = require('@config/mdm');
const logger = require('@utils/logger');

function getApnProvider() {
  if (!process.env.APNS_KEY_PATH || !process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID) {
    return null;
  }

  return new apn.Provider({
    token: {
      key: process.env.APNS_KEY_PATH,
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID
    },
    production: process.env.NODE_ENV === 'production'
  });
}

/**
 * Creates a pending MDM command record.
 *
 * @param {object} device
 * @param {string} command
 * @param {string} reason
 * @param {string} issuedBy
 * @returns {Promise<object>}
 */
async function createPendingCommand(device, command, reason, issuedBy) {
  return DeviceCommand.create({
    deviceId: device.id,
    command,
    issuedBy: issuedBy || 'system',
    reason,
    status: 'pending'
  });
}

/**
 * Updates a device command delivery status.
 *
 * @param {object} command
 * @param {'pending'|'delivered'|'acknowledged'|'failed'} status
 * @param {object} metadata
 * @returns {Promise<object>}
 */
async function finalizeCommand(command, status, metadata) {
  await command.update({
    status,
    deliveredAt: status === 'delivered' || status === 'acknowledged' ? new Date() : command.deliveredAt,
    reason: metadata && metadata.reason ? metadata.reason : command.reason
  });

  return command;
}

/**
 * Resolves the configured Google credentials for Android Management API.
 *
 * @returns {Promise<string>}
 * @throws {Error}
 */
async function getGoogleAccessToken() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : undefined;
  const auth = new GoogleAuth({
    credentials,
    keyFilename: credentials ? undefined : process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/androidmanagement']
  });
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();

  if (!accessTokenResponse || !accessTokenResponse.token) {
    throw new Error('Unable to resolve Google access token for AMAPI');
  }

  return accessTokenResponse.token;
}

/**
 * Sends the Android Management API disabled state command.
 *
 * Endpoint:
 * PATCH https://androidmanagement.googleapis.com/v1/enterprises/{enterprise}/devices/{deviceId}
 * Body: { state: 'DISABLED' }
 * Auth: Bearer <service-account-oauth-token>
 *
 * @param {object} device
 * @param {string} reason
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function androidLock(device, reason, command) {
  try {
    const enterpriseId = process.env.AMAPI_ENTERPRISE_ID;
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(
      'https://androidmanagement.googleapis.com/v1/enterprises/' + enterpriseId + '/devices/' + device.mdmEnrollmentId,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'DISABLED'
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || 'AMAPI lock request failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('Android lock failed', {
      deviceId: device.id,
      error: error.message,
      reason
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends the Android Management API active state command.
 *
 * Endpoint:
 * PATCH https://androidmanagement.googleapis.com/v1/enterprises/{enterprise}/devices/{deviceId}
 * Body: { state: 'ACTIVE' }
 *
 * @param {object} device
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function androidUnlock(device, command) {
  try {
    const enterpriseId = process.env.AMAPI_ENTERPRISE_ID;
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(
      'https://androidmanagement.googleapis.com/v1/enterprises/' + enterpriseId + '/devices/' + device.mdmEnrollmentId,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'ACTIVE'
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || 'AMAPI unlock request failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('Android unlock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Wakes an iOS device via APNs so the MDM server can send a DeviceLock command.
 *
 * Apple MDM lock payload:
 * { Command: { RequestType: 'DeviceLock', PIN: '000000' } }
 *
 * Requires Apple Business Manager supervised enrollment before the device is sold.
 *
 * @param {object} device
 * @param {string} reason
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function iosLock(device, reason, command) {
  try {
    const provider = getApnProvider();

    if (!provider || !device.apnsToken) {
      throw new Error('APNs provider or device token is not configured');
    }

    const notification = new apn.Notification({
      topic: process.env.APNS_TOPIC,
      payload: {
        mdm: process.env.IOS_MDM_PUSH_MAGIC || device.mdmEnrollmentId,
        command: {
          Command: {
            RequestType: 'DeviceLock',
            PIN: '000000'
          }
        },
        reason
      }
    });

    const result = await provider.send(notification, device.apnsToken);

    if (result.failed && result.failed.length) {
      throw new Error(result.failed[0].response?.reason || 'APNs lock wake push failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('iOS lock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Wakes an iOS device so the MDM server can send ClearPasscode and remove
 * the restriction profile after the account is brought current.
 *
 * MDM command:
 * { Command: { RequestType: 'ClearPasscode' } }
 *
 * @param {object} device
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function iosUnlock(device, command) {
  try {
    const provider = getApnProvider();

    if (!provider || !device.apnsToken) {
      throw new Error('APNs provider or device token is not configured');
    }

    const notification = new apn.Notification({
      topic: process.env.APNS_TOPIC,
      payload: {
        mdm: process.env.IOS_MDM_PUSH_MAGIC || device.mdmEnrollmentId,
        command: {
          Command: {
            RequestType: 'ClearPasscode'
          }
        }
      }
    });

    const result = await provider.send(notification, device.apnsToken);

    if (result.failed && result.failed.length) {
      throw new Error(result.failed[0].response?.reason || 'APNs unlock wake push failed');
    }

    await finalizeCommand(command, 'acknowledged');
    return { success: true };
  } catch (error) {
    logger.error('iOS unlock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends an FCM data message to the Electron desktop agent to enter kiosk mode.
 *
 * FCM payload:
 * { type: 'LOCK', reason, deviceId }
 *
 * @param {object} device
 * @param {string} reason
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function windowsLock(device, reason, command) {
  try {
    const { sendPush } = require('@services/notification.service');
    const response = await sendPush(device.fcmToken, 'windows', 'FlexiPay device lock', reason, {
      type: 'LOCK',
      deviceId: device.id,
      reason
    });

    if (!response.success) {
      throw new Error(response.error || 'FCM windows lock failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('Windows lock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends an FCM data message to the Electron desktop agent to release kiosk mode.
 *
 * FCM payload:
 * { type: 'UNLOCK', deviceId }
 *
 * @param {object} device
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function windowsUnlock(device, command) {
  try {
    const { sendPush } = require('@services/notification.service');
    const response = await sendPush(device.fcmToken, 'windows', 'FlexiPay device unlock', 'Account is current', {
      type: 'UNLOCK',
      deviceId: device.id
    });

    if (!response.success) {
      throw new Error(response.error || 'FCM windows unlock failed');
    }

    await finalizeCommand(command, 'acknowledged');
    return { success: true };
  } catch (error) {
    logger.error('Windows unlock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends a macOS agent FCM command or relies on Apple MDM profile restrictions.
 *
 * @param {object} device
 * @param {string} reason
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function macLock(device, reason, command) {
  try {
    const { sendPush } = require('@services/notification.service');
    const response = await sendPush(device.fcmToken, 'mac', 'FlexiPay device lock', reason, {
      type: 'LOCK',
      deviceId: device.id,
      reason
    });

    if (!response.success) {
      throw new Error(response.error || 'FCM mac lock failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('macOS lock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends a macOS unlock instruction to the Electron agent or Apple MDM layer.
 *
 * @param {object} device
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function macUnlock(device, command) {
  try {
    const { sendPush } = require('@services/notification.service');
    const response = await sendPush(device.fcmToken, 'mac', 'FlexiPay device unlock', 'Account is current', {
      type: 'UNLOCK',
      deviceId: device.id
    });

    if (!response.success) {
      throw new Error(response.error || 'FCM mac unlock failed');
    }

    await finalizeCommand(command, 'acknowledged');
    return { success: true };
  } catch (error) {
    logger.error('macOS unlock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends a lock request to the GPS/telematics immobilizer vendor API.
 *
 * Example vendor structure for Teltonika/Ruptela style APIs:
 * POST {vendorBaseUrl}/commands
 * Body: { deviceSerial, command: 'IMMOBILIZE', reason }
 *
 * @param {object} device
 * @param {string} reason
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function carLock(device, reason, command) {
  try {
    const response = await axios.post(process.env.CAR_DEVICE_API_URL, {
      deviceSerial: device.serialNumber,
      command: 'IMMOBILIZE',
      reason
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.CAR_DEVICE_API_KEY ? 'Bearer ' + process.env.CAR_DEVICE_API_KEY : undefined
      }
    });

    if (response.status >= 400) {
      throw new Error('Vehicle API lock request failed');
    }

    await finalizeCommand(command, 'delivered');
    return { success: true };
  } catch (error) {
    logger.error('Vehicle lock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends a release request to the telematics immobilizer vendor API.
 *
 * @param {object} device
 * @param {object} command
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function carUnlock(device, command) {
  try {
    const response = await axios.post(process.env.CAR_DEVICE_API_URL, {
      deviceSerial: device.serialNumber,
      command: 'MOBILIZE'
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.CAR_DEVICE_API_KEY ? 'Bearer ' + process.env.CAR_DEVICE_API_KEY : undefined
      }
    });

    if (response.status >= 400) {
      throw new Error('Vehicle API unlock request failed');
    }

    await finalizeCommand(command, 'acknowledged');
    return { success: true };
  } catch (error) {
    logger.error('Vehicle unlock failed', {
      deviceId: device.id,
      error: error.message
    });
    await finalizeCommand(command, 'failed', { reason: error.message });
    return { success: false, error: error.message };
  }
}

function getHandlers(action) {
  return {
    android: action === 'lock' ? androidLock : androidUnlock,
    ios: action === 'lock' ? iosLock : iosUnlock,
    windows: action === 'lock' ? windowsLock : windowsUnlock,
    mac: action === 'lock' ? macLock : macUnlock,
    car: action === 'lock' ? carLock : carUnlock
  };
}

/**
 * Locks a device through the platform-specific MDM channel.
 *
 * @param {string} deviceId
 * @param {string} reason
 * @param {string} issuedBy
 * @returns {Promise<{ success: boolean, commandId: string }>}
 * @throws {Error}
 */
async function lockDevice(deviceId, reason, issuedBy) {
  const device = await Device.findByPk(deviceId, {
    attributes: ['id', 'type', 'mdmEnrollmentId', 'fcmToken', 'apnsToken', 'serialNumber', 'isLocked']
  });

  if (!device) {
    throw new Error('Device not found');
  }

  const command = await createPendingCommand(device, 'lock', reason, issuedBy);
  const handlers = getHandlers('lock');
  const handler = handlers[device.type];

  if (!handler) {
    await finalizeCommand(command, 'failed', { reason: 'Unsupported device platform' });
    throw new Error('Unsupported device platform');
  }

  const response = await handler(device, reason, command);

  await Device.update({
    isLocked: true,
    lockReason: reason
  }, {
    where: {
      id: device.id
    }
  });

  return {
    success: response.success,
    commandId: command.id
  };
}

/**
 * Unlocks a device through the platform-specific MDM channel.
 *
 * @param {string} deviceId
 * @param {string} issuedBy
 * @returns {Promise<{ success: boolean, commandId: string }>}
 * @throws {Error}
 */
async function unlockDevice(deviceId, issuedBy) {
  const device = await Device.findByPk(deviceId, {
    attributes: ['id', 'type', 'mdmEnrollmentId', 'fcmToken', 'apnsToken', 'serialNumber']
  });

  if (!device) {
    throw new Error('Device not found');
  }

  const command = await createPendingCommand(device, 'unlock', 'Loan account brought current', issuedBy);
  const handlers = getHandlers('unlock');
  const handler = handlers[device.type];

  if (!handler) {
    await finalizeCommand(command, 'failed', { reason: 'Unsupported device platform' });
    throw new Error('Unsupported device platform');
  }

  const response = await handler(device, 'Loan account brought current', command);

  await Device.update({
    isLocked: false,
    lockReason: null
  }, {
    where: {
      id: device.id
    }
  });

  return {
    success: response.success,
    commandId: command.id
  };
}

module.exports = {
  lockDevice,
  unlockDevice,
  androidLock,
  androidUnlock,
  iosLock,
  iosUnlock,
  windowsLock,
  windowsUnlock,
  macLock,
  macUnlock,
  carLock,
  carUnlock
};
