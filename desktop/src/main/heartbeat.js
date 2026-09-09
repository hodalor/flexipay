const axios = require('axios');
const { net, powerMonitor } = require('electron');
const lockManager = require('@main/lock.manager');
const logger = require('@main/logger');
const { store, setValues } = require('@main/state.store');

function getDeviceContext() {
  const deviceId = store.get('deviceId') || process.env.DEVICE_ID;
  const deviceToken = store.get('deviceToken') || process.env.DEVICE_TOKEN;
  const backendUrl = store.get('backendUrl') || process.env.BACKEND_URL || 'http://localhost:4000/api';

  return {
    deviceId,
    deviceToken,
    backendUrl
  };
}

function emitState(mainWindow, channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

/**
 * Polls the backend for the latest lock state and applies local enforcement.
 *
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<object|null>}
 */
async function checkDeviceStatus(mainWindow) {
  const context = getDeviceContext();

  if (!context.deviceId || !context.deviceToken) {
    logger.warn('Device heartbeat skipped because credentials are missing');
    return null;
  }

  if (!net.isOnline()) {
    const lastOnline = store.get('lastOnline', Date.now());
    const hoursOffline = (Date.now() - lastOnline) / 3600000;

    if (hoursOffline > 48 && !lockManager.isLocked()) {
      lockManager.createLockWindow();
      emitState(mainWindow, 'device:locked', {
        reason: 'Offline beyond 48 hour grace period'
      });
    }

    logger.warn('Network is offline; heartbeat deferred', {
      hoursOffline
    });
    return null;
  }

  try {
    const response = await axios.get(context.backendUrl + '/devices/' + context.deviceId + '/status', {
      headers: {
        Authorization: 'Bearer ' + context.deviceToken
      }
    });
    const deviceState = response.data.data;

    setValues({
      lastOnline: Date.now(),
      deviceState,
      deviceId: context.deviceId,
      deviceToken: context.deviceToken
    });

    if (deviceState.isLocked && !lockManager.isLocked()) {
      lockManager.createLockWindow();
      emitState(mainWindow, 'device:locked', deviceState);
    } else if (!deviceState.isLocked && lockManager.isLocked()) {
      lockManager.releaseLock();
      emitState(mainWindow, 'device:unlocked', deviceState);
    }

    emitState(mainWindow, 'device-state', deviceState);
    return deviceState;
  } catch (error) {
    const lastOnline = store.get('lastOnline', Date.now());
    const hoursOffline = (Date.now() - lastOnline) / 3600000;

    if (hoursOffline > 48 && !lockManager.isLocked()) {
      lockManager.createLockWindow();
      emitState(mainWindow, 'device:locked', {
        reason: 'Offline beyond 48 hour grace period'
      });
    }

    logger.warn('Heartbeat request failed', {
      error: error.response?.data || error.message,
      hoursOffline
    });

    return null;
  }
}

/**
 * Starts the recurring device heartbeat and hooks wake/network events.
 *
 * @param {BrowserWindow} mainWindow
 * @returns {NodeJS.Timeout}
 */
function startHeartbeat(mainWindow) {
  checkDeviceStatus(mainWindow).catch(function onInitialError(error) {
    logger.warn('Initial heartbeat failed', {
      error: error.message
    });
  });

  powerMonitor.on('resume', function onResume() {
    checkDeviceStatus(mainWindow).catch(function onResumeError(error) {
      logger.warn('Heartbeat resume check failed', {
        error: error.message
      });
    });
  });

  const intervalId = setInterval(function runHeartbeat() {
    checkDeviceStatus(mainWindow).catch(function onTickError(error) {
      logger.warn('Heartbeat interval failed', {
        error: error.message
      });
    });
  }, 5 * 60 * 1000);

  logger.info('Heartbeat started at 5 minute interval');
  return intervalId;
}

module.exports = {
  startHeartbeat,
  checkDeviceStatus
};
