const { DataTypes } = require('sequelize');

module.exports = function DeviceModel(sequelize) {
  return sequelize.define('Device', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('android', 'ios', 'windows', 'mac', 'linux', 'car'),
      allowNull: false
    },
    deviceCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    imei: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mdmEnrollmentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    apnsToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    lockReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    enrolledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true
  });
};
