const MENU_KEYS = [
  'overview',
  'customers',
  'devices',
  'loans',
  'repayments',
  'admin',
  'settings'
];

const ACTION_KEYS = [
  'customers.create',
  'devices.enroll',
  'devices.lock',
  'devices.unlock',
  'loans.create',
  'loans.cancel',
  'repayments.record',
  'repayments.approve_director',
  'repayments.approve_manager',
  'admin_users.view',
  'admin_users.create',
  'admin_users.update'
];

const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: {
    menus: ['*'],
    actions: ['*']
  },
  admin: {
    menus: ['overview', 'customers', 'devices', 'loans', 'repayments', 'admin', 'settings'],
    actions: ACTION_KEYS
  },
  director: {
    menus: ['overview', 'customers', 'devices', 'loans', 'repayments', 'settings'],
    actions: ['repayments.approve_director']
  },
  manager: {
    menus: ['overview', 'customers', 'devices', 'loans', 'repayments', 'settings'],
    actions: ['repayments.approve_manager']
  },
  loan_officer: {
    menus: ['overview', 'customers', 'devices', 'loans', 'repayments', 'settings'],
    actions: ['customers.create', 'devices.enroll', 'loans.create', 'loans.cancel', 'repayments.record']
  },
  account_officer: {
    menus: ['overview', 'customers', 'loans', 'repayments', 'settings'],
    actions: ['repayments.record']
  }
};

function unique(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function resolvePermissions(role, customPermissions) {
  if (role === 'super_admin') {
    return {
      menus: ['*'],
      actions: ['*']
    };
  }

  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || {
    menus: ['overview'],
    actions: []
  };

  if (!customPermissions || (!Array.isArray(customPermissions.menus) && !Array.isArray(customPermissions.actions))) {
    return {
      menus: unique(defaults.menus),
      actions: unique(defaults.actions)
    };
  }

  return {
    menus: unique(customPermissions.menus),
    actions: unique(customPermissions.actions)
  };
}

function hasAction(permissions, actionKey) {
  return Boolean(
    permissions
    && Array.isArray(permissions.actions)
    && (permissions.actions.includes('*') || permissions.actions.includes(actionKey))
  );
}

module.exports = {
  ACTION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  MENU_KEYS,
  hasAction,
  resolvePermissions
};
