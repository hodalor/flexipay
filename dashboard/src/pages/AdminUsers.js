import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import DataTable from '@components/DataTable';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { createAdminUser, getAdminUsers, updateAdminUser } from '@api';
import {
  ACTION_LABELS,
  ACTION_OPTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  MENU_LABELS,
  MENU_OPTIONS,
  ROLE_LABELS,
  hasAction
} from '@/constants/access';
import { useAuth } from '@hooks/useAuth';
import { metricGridStyle } from '@/styles/layout';

function emptyForm() {
  return {
    id: null,
    fullName: '',
    email: '',
    password: '',
    role: 'admin',
    status: 'active',
    menus: DEFAULT_ROLE_PERMISSIONS.admin.menus,
    actions: DEFAULT_ROLE_PERMISSIONS.admin.actions
  };
}

export default function AdminUsers() {
  const { user } = useAuth();
  const canViewUser = hasAction(user, 'admin_users.view');
  const canCreateUser = hasAction(user, 'admin_users.create');
  const canUpdateUser = hasAction(user, 'admin_users.update');
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 4000
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: function saveUser(payload) {
      if (payload.id) {
        return updateAdminUser(payload.id, payload);
      }

      return createAdminUser(payload);
    },
    onSuccess: () => {
      setFormSuccess(form.id ? 'Admin user updated successfully.' : 'Admin user created successfully.');
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setTimeout(() => {
        setIsModalOpen(false);
        setForm(emptyForm());
        setFormSuccess('');
      }, 300);
    },
    onError: (error) => {
      setFormError(error.response?.data?.message || 'Unable to save admin user.');
    }
  });

  const users = usersQuery.data || [];
  const rows = useMemo(() => {
    return users.map(function toRow(item) {
      return {
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        role: ROLE_LABELS[item.role] || item.role,
        status: item.status,
        menus: summarizePermissions(item.permissions?.menus, MENU_LABELS),
        actions: summarizePermissions(item.permissions?.actions, ACTION_LABELS),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        raw: item
      };
    });
  }, [users]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => item.status === 'active').length,
    superAdmins: users.filter((item) => item.role === 'super_admin').length
  }), [users]);

  function openCreateModal() {
    setForm(emptyForm());
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setForm({
      id: row.raw.id,
      fullName: row.raw.fullName,
      email: row.raw.email,
      password: '',
      role: row.raw.role,
      status: row.raw.status,
      menus: row.raw.permissions?.menus || [],
      actions: row.raw.permissions?.actions || []
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  }

  function updateField(key, value) {
    if (key === 'role') {
      const defaults = DEFAULT_ROLE_PERMISSIONS[value] || { menus: [], actions: [] };
      setForm((current) => ({
        ...current,
        role: value,
        menus: defaults.menus,
        actions: defaults.actions
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function togglePermission(type, value) {
    setForm((current) => {
      const list = current[type];
      const exists = list.includes(value);

      return {
        ...current,
        [type]: exists ? list.filter((item) => item !== value) : [...list, value]
      };
    });
  }

  function handleSubmit() {
    setFormError('');
    setFormSuccess('');

    if (!form.fullName || !form.email || !form.role) {
      setFormError('Full name, email, and role are required.');
      return;
    }

    if (!form.id && !form.password) {
      setFormError('Password is required when creating a user.');
      return;
    }

    const payload = {
      id: form.id,
      fullName: form.fullName,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      status: form.status,
      permissions: form.role === 'super_admin' ? { menus: ['*'], actions: ['*'] } : {
        menus: form.menus,
        actions: form.actions
      }
    };

    mutation.mutate(payload);
  }

  return (
    <div style={styles.page}>
      {!canViewUser && !canCreateUser && !canUpdateUser ? (
        <div style={styles.superAdminCard}>
          Your account does not have access to the users administration view.
        </div>
      ) : null}

      <PageHeader
        eyebrow="Authorization"
        title="Admin users"
        subtitle="Create internal users, assign default role permissions, and adjust menu visibility or action rights with grants."
        actionLabel={canCreateUser ? 'Add user' : null}
        onAction={canCreateUser ? openCreateModal : undefined}
      />

      <div style={styles.metrics}>
        <KPICard label="Admin Users" value={stats.total} />
        <KPICard label="Active Users" value={stats.active} accent="#16a34a" />
        <KPICard label="God Mode Users" value={stats.superAdmins} accent="#a855f7" />
      </div>

      <DataTable
        columns={[
          { key: 'fullName', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'menus', label: 'Menus' },
          { key: 'actions', label: 'Actions' },
          { key: 'createdAt', label: 'Created' },
          {
            key: 'raw',
            label: 'Action',
            render: (row) => canUpdateUser ? (
              <button type="button" style={styles.editButton} onClick={() => openEditModal(row)}>
                Edit grants
              </button>
            ) : 'View only'
          }
        ]}
        rows={canViewUser || canUpdateUser ? rows : []}
      />

      <ActionModal
        isOpen={isModalOpen}
        title={form.id ? 'Edit admin user' : 'Add admin user'}
        subtitle="Super admin runs in god mode. Other roles start with defaults, then you can remove or add grants before saving."
        submitLabel={form.id ? 'Save changes' : 'Create user'}
        loading={mutation.isPending}
        error={formError}
        success={formSuccess}
        onClose={() => {
          setIsModalOpen(false);
          setForm(emptyForm());
          setFormError('');
          setFormSuccess('');
        }}
        onSubmit={handleSubmit}
      >
        <div style={modalFormStyles.grid}>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Full name</label>
            <input style={modalFormStyles.input} value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Email</label>
            <input style={modalFormStyles.input} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Role</label>
            <select style={modalFormStyles.input} value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              {Object.entries(ROLE_LABELS).map(function renderRole(entry) {
                return <option key={entry[0]} value={entry[0]}>{entry[1]}</option>;
              })}
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Status</label>
            <select style={modalFormStyles.input} value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Password</label>
            <input
              style={modalFormStyles.input}
              type="text"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder={form.id ? 'Leave empty to keep current password' : 'Set initial password'}
            />
          </div>
        </div>

        {form.role === 'super_admin' ? (
          <div style={styles.superAdminCard}>
            This user has god mode. All present and future menus and actions are available automatically.
          </div>
        ) : (
          <div style={styles.permissionLayout}>
            <div style={styles.permissionCard}>
              <div style={styles.permissionTitle}>Sidebar menus</div>
              <div style={styles.permissionGrid}>
                {MENU_OPTIONS.map(function renderMenu(menuKey) {
                  return (
                    <label key={menuKey} style={styles.checkRow}>
                      <input type="checkbox" checked={form.menus.includes(menuKey)} onChange={() => togglePermission('menus', menuKey)} />
                      <span>{MENU_LABELS[menuKey]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={styles.permissionCard}>
              <div style={styles.permissionTitle}>Action rights</div>
              <div style={styles.permissionGrid}>
                {ACTION_OPTIONS.map(function renderAction(actionKey) {
                  return (
                    <label key={actionKey} style={styles.checkRow}>
                      <input type="checkbox" checked={form.actions.includes(actionKey)} onChange={() => togglePermission('actions', actionKey)} />
                      <span>{ACTION_LABELS[actionKey]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </ActionModal>
    </div>
  );
}

function summarizePermissions(values, labels) {
  if (!Array.isArray(values) || !values.length) {
    return '-';
  }

  if (values.includes('*')) {
    return 'All';
  }

  return values.map((value) => labels[value] || value).join(', ');
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    ...metricGridStyle
  },
  editButton: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    background: '#0f766e',
    color: '#fff',
    cursor: 'pointer'
  },
  permissionLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px'
  },
  permissionCard: {
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    background: 'rgba(15, 23, 42, 0.58)',
    padding: '16px',
    display: 'grid',
    gap: '14px'
  },
  permissionTitle: {
    color: '#f8fafc',
    fontWeight: '700'
  },
  permissionGrid: {
    display: 'grid',
    gap: '10px'
  },
  checkRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    color: '#cbd5e1'
  },
  superAdminCard: {
    borderRadius: '18px',
    border: '1px solid rgba(168, 85, 247, 0.24)',
    background: 'rgba(88, 28, 135, 0.2)',
    color: '#e9d5ff',
    padding: '16px'
  }
};
