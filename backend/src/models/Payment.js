const { DataTypes } = require('sequelize');

module.exports = function PaymentModel(sequelize) {
  return sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    loanId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    method: {
      type: DataTypes.ENUM('mobile_money', 'card', 'bank_transfer', 'cash'),
      allowNull: false
    },
    channel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Manual payment'
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'reversed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approvalStatus: {
      type: DataTypes.ENUM('not_required', 'gateway_pending', 'pending_director', 'pending_manager', 'completed', 'rejected'),
      allowNull: false,
      defaultValue: 'not_required'
    },
    initiatedByAdminUserId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    directorApproverId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    directorDecision: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    directorRemark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    directorDecidedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    managerApproverId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    managerDecision: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    managerRemark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    managerDecidedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gatewayRef: {
      type: DataTypes.STRING,
      allowNull: true
    },
    providerResponse: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    timestamps: true
  });
};
