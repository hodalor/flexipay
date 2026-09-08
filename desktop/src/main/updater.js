const { autoUpdater } = require('electron-updater');
const logger = require('@main/logger');

function registerUpdater() {
  autoUpdater.on('checking-for-update', function onChecking() {
    logger.info('Checking for desktop agent updates');
  });

  autoUpdater.on('update-available', function onAvailable(info) {
    logger.info('Desktop agent update available', info);
  });

  autoUpdater.on('update-not-available', function onUnavailable(info) {
    logger.info('Desktop agent update not available', info);
  });

  autoUpdater.on('error', function onError(error) {
    logger.warn('Auto updater error', { error: error.message });
  });

  autoUpdater.checkForUpdatesAndNotify().catch(function onCatch(error) {
    logger.warn('Auto updater initialization failed', { error: error.message });
  });
}

module.exports = {
  registerUpdater
};

