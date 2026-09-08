const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
require('./register-aliases');

const { app, BrowserWindow } = require('electron');
const webpack = require('webpack');
const rendererConfig = require('../../webpack.renderer');
const logger = require('@main/logger');
const { interceptSystemShortcuts } = require('@main/lock.manager');
const { verifyAndRepair } = require('@main/startup.manager');
const { installAsService } = require('@main/service.manager');
const { registerIpcHandlers } = require('@main/ipc.handlers');
const { startHeartbeat } = require('@main/heartbeat');
const { registerUpdater } = require('@main/updater');

let mainWindow;

function ensureRendererBundle() {
  const outputFile = path.resolve(__dirname, '../../dist/renderer/index.html');

  if (fs.existsSync(outputFile)) {
    return Promise.resolve();
  }

  return new Promise(function compileRenderer(resolve, reject) {
    webpack(rendererConfig).run(function onBundle(error, stats) {
      if (error || (stats && stats.hasErrors())) {
        reject(error || new Error(stats.toString()));
        return;
      }

      resolve();
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.resolve(__dirname, '../../dist/renderer/index.html'));
}

app.whenReady().then(async function onReady() {
  try {
    await ensureRendererBundle();
    createMainWindow();
    verifyAndRepair();
    installAsService({ isPackaged: app.isPackaged });
    registerIpcHandlers();
    startHeartbeat(mainWindow);
    registerUpdater();
    interceptSystemShortcuts();
  } catch (error) {
    logger.error('Desktop agent bootstrap failed', { error: error.message });
    app.quit();
  }
});

app.on('activate', function onActivate() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }
});

app.on('window-all-closed', function onWindowClosed() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
