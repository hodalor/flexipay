const { BrowserWindow, ipcMain, shell } = require('electron');
const Store = require('electron-store');
const lockManager = require('@main/lock.manager');
const { checkDeviceStatus } = require('@main/heartbeat');
const { enrollDesktopDevice, getEnrollmentState } = require('@main/enrollment.manager');

const store = new Store({
  name: 'flexipay-desktop'
});

/**
 * Registers preload-safe IPC handlers for device state and external payment flows.
 *
 * @returns {void}
 */
function registerIpcHandlers() {
  ipcMain.handle('device:getStatus', function getStatus() {
    const deviceState = store.get('deviceState') || { isLocked: false };

    return {
      ...deviceState,
      isLocked: lockManager.isLocked() || Boolean(deviceState.isLocked),
      deviceId: store.get('deviceId'),
      lastOnline: store.get('lastOnline')
    };
  });

  ipcMain.handle('device:getToken', function getToken() {
    return store.get('deviceToken');
  });

  ipcMain.handle('device:getEnrollmentState', function getEnrollmentSnapshot() {
    return getEnrollmentState();
  });

  ipcMain.handle('device:enroll', async function enrollDesktop(event, payload) {
    const result = await enrollDesktopDevice(payload || {});
    const mainWindow = BrowserWindow.fromWebContents(event.sender);

    if (mainWindow) {
      await checkDeviceStatus(mainWindow).catch(() => null);
    }

    return result;
  });

  ipcMain.handle('store:get', function getStoreValue(event, key) {
    return store.get(key);
  });

  ipcMain.handle('store:set', function setStoreValue(event, key, value) {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('payment:open', function openPayment(event, url) {
    return shell.openExternal(url);
  });

  ipcMain.handle('device:lock', function lock() {
    lockManager.createLockWindow();
    return { success: true };
  });

  ipcMain.handle('device:unlock', function unlock() {
    lockManager.releaseLock();
    return { success: true };
  });
}

module.exports = {
  registerIpcHandlers
};
