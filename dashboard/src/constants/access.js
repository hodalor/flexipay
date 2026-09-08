export const MENU_OPTIONS = [
  'overview',
  'customers',
  'devices',
  'loans',
  'repayments',
  'admin',
  'settings'
];

export const ACTION_OPTIONS = [
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

export const MENU_LABELS = {
  overview: 'Overview',
  customers: 'Customers',
  devices: 'Devices',
  loans: 'Loans',
  repayments: 'Repayments',
  admin: 'Admin',
  settings: 'Settings'
};

export const ACTION_LABELS = {
  'customers.create': 'Create customers',
  'devices.enroll': 'Register devices',
  'devices.lock': 'Lock devices',
  'devices.unlock': 'Unlock devices',
  'loans.create': 'Create loans',
  'loans.cancel': 'Cancel loans',
  'repayments.record': 'Record repayments',
  'repayments.approve_director': 'Director approvals',
  'repayments.approve_manager': 'Manager approvals',
  'admin_users.view': 'View users',
  'admin_users.create': 'Create users',
  'admin_users.update': 'Update users'
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  director: 'Director',
  manager: 'Manager',
  loan_officer: 'Loan Officer',
  account_officer: 'Account Officer'
};

export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: {
    menus: ['*'],
    actions: ['*']
  },
  admin: {
    menus: MENU_OPTIONS,
    actions: ACTION_OPTIONS
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

export function hasMenu(user, menuKey) {
  if (!user) {
    return false;
  }

  if (user.role === 'super_admin') {
    return true;
  }

  const menus = user.permissions?.menus || [];
  return menus.includes('*') || menus.includes(menuKey);
}

export function hasAction(user, actionKey) {
  if (!user) {
    return false;
  }

  if (user.role === 'super_admin') {
    return true;
  }

  const actions = user.permissions?.actions || [];
  return actions.includes('*') || actions.includes(actionKey);
}
