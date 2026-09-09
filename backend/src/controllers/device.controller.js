const { Op } = require('sequelize');
const { Customer, Device, DeviceCommand, Loan } = require('@models');
const { success, failure } = require('@utils/response');
const { generateDeviceToken, generateReference } = require('@utils/crypto');
const { generateNextDeviceCode } = require('@utils/device-code');
const { formatAmount, normalizeAmountInt } = require('@utils/money');
const { lockDevice, unlockDevice } = require('@services/mdm.service');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

async function getDevices(req, res, next) {
  try {
    const devices = await Device.findAll({
      include: [
        { model: Customer, as: 'customer' },
        { model: Loan, as: 'loans' },
        { model: DeviceCommand, as: 'commands' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const deviceRows = devices.map(function mapDevice(device) {
      const activeLoan = (device.loans || []).find(function findActiveLoan(loan) {
        return loan.status === 'active';
      });

      return {
        id: device.id,
        deviceCode: device.deviceCode,
        customerId: device.customerId,
        customerName: device.customer ? device.customer.fullName : null,
        type: device.type,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        imei: device.imei,
        isLocked: device.isLocked,
        lockReason: device.lockReason,
        enrolledAt: device.enrolledAt,
        lastSeen: device.lastSeen || device.updatedAt,
        loanStatus: activeLoan ? activeLoan.status : 'none',
        overdueAmount: activeLoan ? Math.max(normalizeAmountInt(activeLoan.totalPayable) - normalizeAmountInt(activeLoan.amountPaid), 0) : 0,
        overdueAmountDisplay: activeLoan ? formatAmount(Math.max(normalizeAmountInt(activeLoan.totalPayable) - normalizeAmountInt(activeLoan.amountPaid), 0)) : '0.00',
        commands: device.commands || []
      };
    });

    return success(res, 'Devices fetched successfully', deviceRows);
  } catch (error) {
    return next(error);
  }
}

function validateEnrollmentPayload(payload) {
  const requiredFields = ['customerId', 'type', 'brand', 'model'];

  return requiredFields.filter(function findMissing(field) {
    return !payload[field];
  });
}

async function enrollDevice(req, res, next) {
  try {
    const missingFields = validateEnrollmentPayload(req.body);

    if (missingFields.length) {
      return failure(res, 'Missing required enrollment fields', 400, missingFields);
    }

    const customer = await Customer.findByPk(req.body.customerId);

    if (!customer) {
      return failure(res, 'Customer not found', 404);
    }

    const identifierCandidates = [];

    if (req.body.serialNumber) {
      identifierCandidates.push({ serialNumber: req.body.serialNumber });
    }

    if (req.body.mdmEnrollmentId) {
      identifierCandidates.push({ mdmEnrollmentId: req.body.mdmEnrollmentId });
    }

    const existingDevice = identifierCandidates.length
      ? await Device.findOne({
        where: {
          [Op.or]: identifierCandidates
        }
      })
      : null;

    if (existingDevice && existingDevice.customerId !== customer.id) {
      return failure(res, 'This device is already assigned to another customer', 409);
    }

    const enrollmentPayload = {
      customerId: customer.id,
      type: req.body.type,
      brand: req.body.brand,
      model: req.body.model,
      serialNumber: req.body.serialNumber || null,
      imei: req.body.imei || null,
      fcmToken: req.body.fcmToken,
      apnsToken: req.body.apnsToken,
      mdmEnrollmentId: req.body.mdmEnrollmentId || generateReference('MDM'),
      enrolledAt: existingDevice ? (existingDevice.enrolledAt || new Date()) : new Date(),
      lastSeen: new Date()
    };

    const device = existingDevice
      ? await existingDevice.update(enrollmentPayload)
      : await Device.create({
        ...enrollmentPayload,
        deviceCode: await generateNextDeviceCode(Device, req.body.type)
      });

    broadcastRealtimeEvent('device.enrolled', ['devices', 'customers'], {
      deviceId: device.id,
      customerId: customer.id,
      type: device.type
    });

    return success(res, 'Device enrolled successfully', {
      device,
      deviceToken: generateDeviceToken(device)
    }, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateDevice(req, res, next) {
  try {
    if (req.user?.userType !== 'admin') {
      return failure(res, 'Only admin users can edit devices', 403);
    }

    const device = await Device.findByPk(req.params.id);

    if (!device) {
      return failure(res, 'Device not found', 404);
    }

    if (req.body.serialNumber) {
      const conflictingDevice = await Device.findOne({
        where: {
          serialNumber: req.body.serialNumber
        }
      });

      if (conflictingDevice && conflictingDevice.id !== device.id) {
        return failure(res, 'Another device already uses this serial number', 409);
      }
    }

    await device.update({
      brand: req.body.brand || device.brand,
      model: req.body.model || device.model,
      serialNumber: req.body.serialNumber || null,
      imei: req.body.imei || null
    });

    broadcastRealtimeEvent('device.updated', ['devices', 'customers'], {
      deviceId: device.id,
      customerId: device.customerId
    });

    return success(res, 'Device updated successfully', device);
  } catch (error) {
    return next(error);
  }
}

async function getDeviceById(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Loan, as: 'loans' }
      ]
    });

    if (!device) {
      return failure(res, 'Device not found', 404);
    }

    return success(res, 'Device fetched successfully', device);
  } catch (error) {
    return next(error);
  }
}

async function lockManagedDevice(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return failure(res, 'Only administrators can lock devices', 403);
    }

    const result = await lockDevice(req.params.id, req.body.reason || 'Manual lock request', req.user.sub || 'admin');
    broadcastRealtimeEvent('device.locked', ['devices', 'loans'], {
      deviceId: req.params.id
    });
    return success(res, 'Device lock command sent', result);
  } catch (error) {
    return next(error);
  }
}

async function unlockManagedDevice(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return failure(res, 'Only administrators can unlock devices', 403);
    }

    const result = await unlockDevice(req.params.id, req.user.sub || 'admin');
    broadcastRealtimeEvent('device.unlocked', ['devices', 'loans'], {
      deviceId: req.params.id
    });
    return success(res, 'Device unlock command sent', result);
  } catch (error) {
    return next(error);
  }
}

async function getDeviceCommands(req, res, next) {
  try {
    const commands = await DeviceCommand.findAll({
      where: {
        deviceId: req.params.id
      },
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Device commands fetched successfully', commands);
  } catch (error) {
    return next(error);
  }
}

async function getDeviceStatus(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Loan, as: 'loans' }
      ]
    });

    if (!device) {
      return failure(res, 'Device not found', 404);
    }

    if (req.user && req.user.role === 'device' && req.user.deviceId === req.params.id) {
      await device.update({
        lastSeen: new Date()
      });

      broadcastRealtimeEvent('device.heartbeat', ['devices'], {
        deviceId: device.id,
        lastSeen: new Date().toISOString()
      });
    }

    const activeLoan = (device.loans || []).find(function findLoan(loan) {
      return loan.status === 'active' || loan.status === 'defaulted';
    });
    const amountOverdue = activeLoan
      ? Math.max(normalizeAmountInt(activeLoan.totalPayable) - normalizeAmountInt(activeLoan.amountPaid), 0)
      : 0;
    const paymentUrl = process.env.PAYMENT_PORTAL_URL || 'https://pay.flexipay.local';

    return success(res, 'Device status fetched successfully', {
      id: device.id,
      isLocked: device.isLocked,
      lockReason: device.lockReason,
      enrolledAt: device.enrolledAt,
      lastSeen: device.lastSeen || device.updatedAt,
      customerName: device.customer ? device.customer.fullName : null,
      amountOverdue,
      amountOverdueDisplay: formatAmount(amountOverdue),
      paymentUrl,
      supportPhone: process.env.SUPPORT_PHONE || '+260000000000',
      gracePeriodRemainingDays: activeLoan && activeLoan.nextDueDate
        ? Math.max(Number(activeLoan.gracePeriodDays || 0) - Math.max(Math.floor((Date.now() - new Date(activeLoan.nextDueDate).getTime()) / 86400000), 0), 0)
        : 0
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDevices,
  enrollDevice,
  updateDevice,
  getDeviceById,
  lockManagedDevice,
  unlockManagedDevice,
  getDeviceCommands,
  getDeviceStatus
};
