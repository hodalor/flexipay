const { DataTypes } = require('sequelize');

module.exports = function LoanModel(sequelize) {
  return sequelize.define('Loan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    principalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    downPayment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    termMonths: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    monthlyPayment: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    totalPayable: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amountPaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('active', 'paid_off', 'defaulted', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    nextDueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    gracePeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    timestamps: true
  });
};
