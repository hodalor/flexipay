const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const logger = require('@main/logger');

function installWindowsService() {
  const Service = require('node-windows').Service;
  const scriptPath = path.resolve(__dirname, 'index.js');
  const service = new Service({
    name: 'FlexiPayAgent',
    description: 'FlexiPay Device Management Service',
    script: scriptPath,
    wait: 2,
    grow: 0.25,
    maxRestarts: 5
  });

  service.on('install', function onInstall() {
    service.start();
    logger.info('Windows service installed and started');
  });

  service.on('alreadyinstalled', function onAlreadyInstalled() {
    logger.info('Windows service already installed');
  });

  service.on('error', function onError(error) {
    logger.error('Windows service installation failed', {
      error: error.message
    });
  });

  service.install();
}

function installMacLaunchDaemon() {
  const plistPath = '/Library/LaunchDaemons/com.flexipay.agent.plist';
  const scriptPath = path.resolve(__dirname, 'index.js');
  const plistContents = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '<key>Label</key>',
    '<string>com.flexipay.agent</string>',
    '<key>ProgramArguments</key>',
    '<array>',
    '<string>' + process.execPath + '</string>',
    '<string>' + scriptPath + '</string>',
    '</array>',
    '<key>RunAtLoad</key>',
    '<true/>',
    '<key>KeepAlive</key>',
    '<true/>',
    '<key>StandardOutPath</key>',
    '<string>/var/log/flexipay.log</string>',
    '<key>StandardErrorPath</key>',
    '<string>/var/log/flexipay-error.log</string>',
    '</dict>',
    '</plist>'
  ].join('\n');

  try {
    fs.writeFileSync(plistPath, plistContents, 'utf8');
    execFileSync('launchctl', ['load', '-w', plistPath], { stdio: 'pipe' });
    logger.info('macOS LaunchDaemon installed', { plistPath });
  } catch (error) {
    logger.error('macOS LaunchDaemon installation failed', {
      error: error.message,
      hint: 'Administrator privileges are required to write to /Library/LaunchDaemons and load the plist.'
    });
  }
}

/**
 * Installs the desktop agent as an OS service in packaged environments.
 *
 * @param {object} options
 * @returns {void}
 */
function installAsService(options) {
  const isPackaged = options && options.isPackaged;

  if (!isPackaged) {
    logger.info('Persistent service installation skipped in development mode');
    return;
  }

  if (process.platform === 'win32') {
    installWindowsService();
  } else if (process.platform === 'darwin') {
    installMacLaunchDaemon();
  }
}

module.exports = {
  installAsService
};
