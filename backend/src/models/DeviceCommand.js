const { DataTypes } = require('sequelize');

module.exports = function DeviceCommandModel(sequelize) {
  return sequelize.define('DeviceCommand', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    command: {
      type: DataTypes.ENUM('lock', 'unlock', 'wipe_warn', 'locate'),
      allowNull: false
    },
    issuedBy: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'delivered', 'acknowledged', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true
  });
};

