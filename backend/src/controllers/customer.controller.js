const { Customer, Device, Loan, Payment } = require('@models');
const { success, failure } = require('@utils/response');
const { hashPassword } = require('@utils/crypto');
const { broadcastRealtimeEvent } = require('@services/realtime.service');

async function getAllCustomers(req, res, next) {
  try {
    const customers = await Customer.findAll({
      include: [
        { model: Device, as: 'devices' },
        { model: Loan, as: 'loans' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Customers fetched successfully', customers);
  } catch (error) {
    return next(error);
  }
}

async function getCustomerById(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        { model: Device, as: 'devices' },
        { model: Loan, as: 'loans' },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!customer) {
      return failure(res, 'Customer not found', 404);
    }

    return success(res, 'Customer fetched successfully', customer);
  } catch (error) {
    return next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return failure(res, 'Customer not found', 404);
    }

    const updates = {
      fullName: req.body.fullName || customer.fullName,
      phone: req.body.phone || customer.phone,
      email: req.body.email || customer.email,
      nationalId: req.body.nationalId || customer.nationalId,
      status: req.body.status || customer.status
    };

    if (req.body.password) {
      updates.passwordHash = await hashPassword(req.body.password);
    }

    await customer.update(updates);
    broadcastRealtimeEvent('customer.updated', ['customers'], {
      customerId: customer.id
    });
    return success(res, 'Customer updated successfully', customer);
  } catch (error) {
    return next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return failure(res, 'Customer not found', 404);
    }

    await customer.destroy();
    broadcastRealtimeEvent('customer.deleted', ['customers', 'devices', 'loans', 'payments'], {
      customerId: req.params.id
    });
    return success(res, 'Customer deleted successfully', null);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
