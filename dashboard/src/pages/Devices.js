import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import ConfirmModal from '@components/ConfirmModal';
import DataTable from '@components/DataTable';
import DeviceStatusBadge from '@components/DeviceStatusBadge';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { enrollDevice, lockDevice, unlockDevice } from '@api';
import { useCustomers } from '@hooks/useCustomers';
import { useDevices } from '@hooks/useDevices';
import { hasAction } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';

function deriveStatus(device) {
  const lastSeen = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  const hoursOffline = lastSeen ? (Date.now() - lastSeen) / 3600000 : Number.MAX_SAFE_INTEGER;

  if (hoursOffline > 24) {
    return 'offline';
  }

  if (device.isLocked) {
    return 'locked';
  }

  if (device.loanStatus === 'defaulted' || Number(device.overdueAmount || 0) > 0) {
    return 'overdue';
  }

  return 'active';
}

export default function Devices() {
  const { user } = useAuth();
  const canEnroll = hasAction(user, 'devices.enroll');
  const canLock = hasAction(user, 'devices.lock');
  const canUnlock = hasAction(user, 'devices.unlock');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const devicesQuery = useDevices();
  const customersQuery = useCustomers();
  const [pendingAction, setPendingAction] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    overdueOnly: false
  });
  const [toast, setToast] = useState(null);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    type: 'android',
    brand: '',
    model: '',
    serialNumber: '',
    imei: ''
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return null;
      }
      if (pendingAction.action === 'lock') {
        return lockDevice(pendingAction.id, 'Manual lock triggered from dashboard');
      }
      return unlockDevice(pendingAction.id);
    },
    onSuccess: () => {
      setToast({
        type: 'success',
        message: 'Device ' + (pendingAction.action === 'lock' ? 'locked' : 'unlocked') + ' successfully.'
      });
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => {
      setToast({
        type: 'error',
        message: error.response?.data?.message || 'Device action failed.'
      });
    }
  });

  const enrollMutation = useMutation({
    mutationFn: enrollDevice,
    onSuccess: (data) => {
      setEnrollSuccess('Device enrolled successfully. Device token is now ready for heartbeat and lock sync.');
      setEnrollError('');
      setForm({
        customerId: '',
        type: 'android',
        brand: '',
        model: '',
        serialNumber: '',
        imei: ''
      });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setToast({
        type: 'success',
        message: 'Device enrolled: ' + data.device.brand + ' ' + data.device.model
      });
    },
    onError: (error) => {
      setEnrollError(error.response?.data?.message || 'Device enrollment failed.');
    }
  });

  const rows = useMemo(() => {
    return (devicesQuery.data || []).map(function toRow(device) {
      const status = deriveStatus(device);
      return {
        id: device.id,
        customerId: device.customerId,
        customerName: device.customerName || 'Unknown customer',
        deviceType: device.type,
        deviceModel: device.brand + ' ' + device.model,
        identifier: device.imei || device.serialNumber,
        loanStatus: device.loanStatus,
        status,
        lastSeen: device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never',
        action: device.isLocked ? 'unlock' : 'lock'
      };
    }).filter(function applyFilters(device) {
      return (filters.status === 'all' || device.status === filters.status)
        && (filters.type === 'all' || device.deviceType === filters.type)
        && (!filters.overdueOnly || device.status === 'overdue' || device.status === 'locked');
    });
  }, [devicesQuery.data, filters]);

  const stats = useMemo(() => {
    const devices = devicesQuery.data || [];
    return {
      total: devices.length,
      locked: devices.filter((device) => device.isLocked).length,
      active: devices.filter((device) => deriveStatus(device) === 'active').length
    };
  }, [devicesQuery.data]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleEnroll() {
    setEnrollError('');
    setEnrollSuccess('');

    if (!form.customerId || !form.type || !form.brand || !form.model || !form.serialNumber) {
      setEnrollError('Customer, type, brand, model, and serial number are required.');
      return;
    }

    enrollMutation.mutate(form);
  }

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Device Control"
        title="Device fleet"
        subtitle="Enroll financed devices, watch live status changes from mobile and desktop clients, and send immediate lock actions from the same queue."
        actionLabel={canEnroll ? 'Register device' : null}
        onAction={canEnroll ? () => {
          setEnrollError('');
          setEnrollSuccess('');
          setIsEnrollOpen(true);
        } : undefined}
      />

      <div style={styles.metrics}>
        <KPICard label="Registered Devices" value={stats.total} />
        <KPICard label="Active Devices" value={stats.active} accent="#16a34a" />
        <KPICard label="Locked Devices" value={stats.locked} accent="#dc2626" />
      </div>

      <div style={styles.filterBar}>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} style={styles.filterControl}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="locked">Locked</option>
          <option value="offline">Offline</option>
        </select>
        <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} style={styles.filterControl}>
          <option value="all">All devices</option>
          <option value="android">Android</option>
          <option value="ios">iOS</option>
          <option value="windows">Windows</option>
          <option value="mac">Mac</option>
          <option value="car">Car</option>
        </select>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={(event) => setFilters({ ...filters, overdueOnly: event.target.checked })}
          />
          Overdue only
        </label>
      </div>
      <DataTable
        columns={[
          { key: 'customerName', label: 'Customer' },
          { key: 'deviceType', label: 'Device Type' },
          { key: 'deviceModel', label: 'Model' },
          { key: 'identifier', label: 'IMEI / Serial' },
          { key: 'loanStatus', label: 'Loan Status' },
          { key: 'status', label: 'Status', render: (row) => <DeviceStatusBadge status={row.status} /> },
          { key: 'lastSeen', label: 'Last Seen' },
          {
            key: 'action',
            label: 'Action',
            render: (row) => (
              <div style={styles.actions}>
                <button
                  style={{
                    ...(row.action === 'lock' ? styles.lockButton : styles.unlockButton),
                    ...((row.action === 'lock' && !canLock) || (row.action === 'unlock' && !canUnlock) ? styles.disabledButton : null)
                  }}
                  onClick={() => {
                    setToast(null);
                    setPendingAction({ id: row.id, action: row.action });
                  }}
                  disabled={(row.action === 'lock' && !canLock) || (row.action === 'unlock' && !canUnlock)}
                >
                  {row.action === 'lock' ? 'Lock' : 'Unlock'}
                </button>
                <button style={styles.viewButton} onClick={() => navigate('/customers/' + row.customerId)}>
                  View
                </button>
              </div>
            )
          }
        ]}
        rows={rows}
      />
      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        title={pendingAction ? (pendingAction.action === 'lock' ? 'Lock device' : 'Unlock device') : ''}
        message="Confirm this action for the selected financed device."
        confirmLabel={pendingAction ? (pendingAction.action === 'lock' ? 'Lock Device' : 'Unlock Device') : 'Confirm'}
        danger={Boolean(pendingAction && pendingAction.action === 'lock')}
        loading={mutation.isPending}
        toast={toast}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => mutation.mutate()}
      />

      <ActionModal
        isOpen={isEnrollOpen}
        title="Register device"
        subtitle="Use this for desktop, retail pre-enrollment, or assisted onboarding. Mobile can still self-enroll automatically after customer login."
        submitLabel="Enroll device"
        loading={enrollMutation.isPending}
        error={enrollError}
        success={enrollSuccess}
        onClose={() => setIsEnrollOpen(false)}
        onSubmit={handleEnroll}
      >
        <div style={modalFormStyles.grid}>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Customer</label>
            <select style={modalFormStyles.input} value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)}>
              <option value="">Select customer</option>
              {(customersQuery.data || []).map(function renderCustomer(customer) {
                return <option key={customer.id} value={customer.id}>{customer.fullName}</option>;
              })}
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Device type</label>
            <select style={modalFormStyles.input} value={form.type} onChange={(event) => updateField('type', event.target.value)}>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="windows">Windows</option>
              <option value="mac">Mac</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Brand</label>
            <input style={modalFormStyles.input} value={form.brand} onChange={(event) => updateField('brand', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Model</label>
            <input style={modalFormStyles.input} value={form.model} onChange={(event) => updateField('model', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Serial number</label>
            <input style={modalFormStyles.input} value={form.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>IMEI</label>
            <input style={modalFormStyles.input} value={form.imei} onChange={(event) => updateField('imei', event.target.value)} />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(180px, 240px))',
    gap: '12px'
  },
  button: {
    background: '#0f766e',
    color: '#fff',
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer'
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '2px',
    flexWrap: 'wrap'
  },
  filterControl: {
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: '12px',
    padding: '10px 12px',
    background: 'rgba(15, 23, 42, 0.72)',
    color: '#f8fafc'
  },
  checkboxRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    color: '#cbd5e1'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  lockButton: {
    background: '#dc2626',
    color: '#fff',
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer'
  },
  unlockButton: {
    background: '#16a34a',
    color: '#fff',
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer'
  },
  viewButton: {
    background: '#e2e8f0',
    color: '#0f172a',
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer'
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
};
