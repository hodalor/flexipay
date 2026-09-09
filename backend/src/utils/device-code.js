const { Op } = require('sequelize');

const DEVICE_CODE_PREFIXES = {
  windows: 'WIN',
  mac: 'MAC',
  android: 'AND',
  ios: 'IOS',
  linux: 'LNX',
  car: 'CAR'
};

function deviceCodePrefix(type) {
  return DEVICE_CODE_PREFIXES[type] || 'DEV';
}

function formatDeviceCode(type, sequence) {
  return deviceCodePrefix(type) + String(Number(sequence) || 0).padStart(7, '0');
}

async function generateNextDeviceCode(Device, type) {
  const prefix = deviceCodePrefix(type);
  const latestDevice = await Device.findOne({
    attributes: ['deviceCode'],
    where: {
      deviceCode: {
        [Op.like]: prefix + '%'
      }
    },
    order: [['deviceCode', 'DESC']]
  });

  const latestCode = latestDevice && latestDevice.deviceCode ? String(latestDevice.deviceCode) : '';
  const latestSequence = Number(latestCode.slice(prefix.length)) || 0;

  return formatDeviceCode(type, latestSequence + 1);
}

module.exports = {
  DEVICE_CODE_PREFIXES,
  deviceCodePrefix,
  formatDeviceCode,
  generateNextDeviceCode
};
