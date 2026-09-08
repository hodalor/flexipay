const path = require('path');
const { pathToFileURL } = require('url');
const { BrowserWindow, globalShortcut, powerMonitor, app } = require('electron');
const logger = require('@main/logger');

let lockWindow = null;
let resumeListenerRegistered = false;

function getLockUrl() {
  return pathToFileURL(path.resolve(__dirname, '../../dist/renderer/index.html')).toString() + '#locked';
}

function assertLockWindowZOrder() {
  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.setAlwaysOnTop(true, 'screen-saver');
    lockWindow.focus();
  }
}

/**
 * Creates and hardens the kiosk lock window.
 *
 * @returns {BrowserWindow}
 */
function createLockWindow() {
  if (lockWindow && !lockWindow.isDestroyed()) {
    assertLockWindowZOrder();
    return lockWindow;
  }

  lockWindow = new BrowserWindow({
    fullscreen: true,
    alwaysOnTop: true,
    kiosk: true,
    skipTaskbar: true,
    frame: false,
    resizable: false,
    closable: false,
    minimizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  lockWindow.on('close', function preventClose(event) {
    event.preventDefault();
    assertLockWindowZOrder();
  });

  if (!resumeListenerRegistered) {
    powerMonitor.on('resume', function onResume() {
      assertLockWindowZOrder();
      logger.info('Power resume detected; kiosk lock re-asserted', {
        appName: app.getName()
      });
    });
    resumeListenerRegistered = true;
  }

  lockWindow.loadURL(getLockUrl());
  assertLockWindowZOrder();
  interceptSystemShortcuts();
  logger.info('Lock window created');
  return lockWindow;
}

/**
 * Releases the kiosk lock and clears shortcut hooks.
 *
 * @returns {void}
 */
function releaseLock() {
  globalShortcut.unregisterAll();

  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.removeAllListeners('close');
    lockWindow.destroy();
    logger.info('Lock window released');
  }

  lockWindow = null;
}

/**
 * Blocks supported system shortcuts and records unsupported ones.
 *
 * @returns {void}
 */
function interceptSystemShortcuts() {
  const requestedShortcuts = [
    'Alt+F4',
    'Super',
    'Meta',
    'Control+Alt+Delete',
    'Control+Shift+Escape',
    'Alt+Tab',
    'Control+W',
    'Control+F4'
  ];
  const fallbackShortcuts = ['Alt+F4', 'Control+Shift+Escape', 'Control+W', 'Control+F4'];

  globalShortcut.unregisterAll();

  try {
    globalShortcut.registerAll(requestedShortcuts, function blockShortcuts() {});
    logger.info('Requested global shortcuts registered', {
      shortcuts: requestedShortcuts
    });
  } catch (error) {
    logger.warn('Full shortcut registration failed; applying supported fallback set', {
      error: error.message
    });

    fallbackShortcuts.forEach(function registerShortcut(accelerator) {
      try {
        const registered = globalShortcut.register(accelerator, function blockShortcut() {});

        if (!registered) {
          logger.warn('Unable to register global shortcut', { accelerator });
        }
      } catch (registrationError) {
        logger.warn('Global shortcut registration failed', {
          accelerator,
          error: registrationError.message
        });
      }
    });
  }

  logger.warn('Windows key interception is not supported directly by Electron global shortcuts');
  logger.warn('Ctrl+Alt+Delete interception is not supported directly by Electron global shortcuts');
  logger.warn('Alt+Tab interception is not supported directly by Electron global shortcuts');
  logger.warn('Ctrl+Alt+Del requires operating system policy and cannot be intercepted directly');
}
/**
 * Indicates whether the lock window is currently active.
 *
 * @returns {boolean}
 */
function isLocked() {
  return Boolean(lockWindow && !lockWindow.isDestroyed());
}
module.exports = {
  createLockWindow,
  releaseLock,
  interceptSystemShortcuts,
  isLocked
};
