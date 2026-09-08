const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flexipay', {
  getStatus: function getStatus() {
    return ipcRenderer.invoke('device:getStatus');
  },
  getToken: function getToken() {
    return ipcRenderer.invoke('device:getToken');
  },
  getEnrollmentState: function getEnrollmentState() {
    return ipcRenderer.invoke('device:getEnrollmentState');
  },
  enrollDevice: function enrollDevice(payload) {
    return ipcRenderer.invoke('device:enroll', payload);
  },
  openPayment: function openPayment(url) {
    return ipcRenderer.invoke('payment:open', url);
  },
  getStoreValue: function getStoreValue(key) {
    return ipcRenderer.invoke('store:get', key);
  },
  setStoreValue: function setStoreValue(key, value) {
    return ipcRenderer.invoke('store:set', key, value);
  },
  onLocked: function onLocked(callback) {
    ipcRenderer.on('device:locked', callback);
  },
  onUnlocked: function onUnlocked(callback) {
    ipcRenderer.on('device:unlocked', callback);
  }
});
