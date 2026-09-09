const fs = require('fs');
const os = require('os');
const path = require('path');
const Store = require('electron-store');
const logger = require('@main/logger');

const store = new Store({
  name: 'flexipay-desktop'
});

const backupDirectory = path.join(os.homedir(), '.flexipay-desktop');
const backupFile = path.join(backupDirectory, 'session.json');

function ensureBackupDirectory() {
  fs.mkdirSync(backupDirectory, { recursive: true });
}

function readBackupState() {
  try {
    if (!fs.existsSync(backupFile)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  } catch (error) {
    logger.warn('Failed to read desktop backup state', {
      error: error.message
    });
    return null;
  }
}

function writeBackupState(snapshot) {
  try {
    ensureBackupDirectory();
    fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    logger.warn('Failed to persist desktop backup state', {
      error: error.message
    });
  }
}

function buildBackupSnapshot() {
  return {
    installationId: store.get('installationId') || null,
    deviceId: store.get('deviceId') || null,
    deviceToken: store.get('deviceToken') || null,
    backendUrl: store.get('backendUrl') || null,
    serialNumber: store.get('serialNumber') || null,
    customerProfile: store.get('customerProfile') || null,
    deviceState: store.get('deviceState') || null,
    lastOnline: store.get('lastOnline') || null
  };
}

function persistBackup() {
  writeBackupState(buildBackupSnapshot());
}

function rehydrateFromBackup() {
  const backupState = readBackupState();

  if (!backupState) {
    return;
  }

  Object.entries(backupState).forEach(([key, value]) => {
    if ((store.get(key) === undefined || store.get(key) === null || store.get(key) === '') && value !== undefined && value !== null && value !== '') {
      store.set(key, value);
    }
  });
}

function setValue(key, value) {
  store.set(key, value);
  persistBackup();
}

function setValues(values) {
  Object.entries(values).forEach(([key, value]) => {
    store.set(key, value);
  });
  persistBackup();
}

rehydrateFromBackup();

module.exports = {
  store,
  setValue,
  setValues,
  persistBackup,
  rehydrateFromBackup
};
