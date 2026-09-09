const { DataTypes, QueryTypes } = require('sequelize');
const { formatDeviceCode } = require('@utils/device-code');

async function ensureDeviceCodeColumn(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  let tableDefinition;

  try {
    tableDefinition = await queryInterface.describeTable('Devices');
  } catch (error) {
    return;
  }

  if (!tableDefinition.deviceCode) {
    await queryInterface.addColumn('Devices', 'deviceCode', {
      type: DataTypes.STRING,
      allowNull: true
    });
  }

  const devices = await sequelize.query(
    'SELECT id, type, "deviceCode" FROM "Devices" ORDER BY "createdAt" ASC',
    { type: QueryTypes.SELECT }
  );

  const counters = {};

  for (const device of devices) {
    const type = device.type || 'windows';
    const currentCount = counters[type] || 0;
    const nextCount = currentCount + 1;
    counters[type] = nextCount;

    if (device.deviceCode) {
      continue;
    }

    await sequelize.query(
      'UPDATE "Devices" SET "deviceCode" = :deviceCode WHERE id = :id',
      {
        replacements: {
          id: device.id,
          deviceCode: formatDeviceCode(type, nextCount)
        },
        type: QueryTypes.UPDATE
      }
    );
  }
}

module.exports = {
  ensureDeviceCodeColumn
};
