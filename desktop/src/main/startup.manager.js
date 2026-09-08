const { app } = require('electron');
const logger = require('@main/logger');

function loginItemOptions() {
  return {
    openAtLogin: true,
    openAsHidden: true,
    name: 'FlexiPay Agent',
    path: process.execPath,
    args: app.isPackaged ? ['--background-agent'] : []
  };
}

/**
 * Registers the desktop agent to run at OS startup.
 *
 * @returns {boolean}
 */
function registerStartup() {
  app.setLoginItemSettings(loginItemOptions());

  const settings = app.getLoginItemSettings();

  if (!settings.openAtLogin) {
    logger.warn('Startup registration missing; retrying once');

    app.setLoginItemSettings(loginItemOptions());
  }

  logger.info('Startup registration verified', { openAtLogin: app.getLoginItemSettings().openAtLogin });
  return app.getLoginItemSettings().openAtLogin;
}

/**
 * Ensures the startup entry exists every time the app launches.
 *
 * @returns {boolean}
 */
function verifyAndRepair() {
  return registerStartup();
}

module.exports = {
  registerStartup,
  verifyAndRepair
};
