import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import ConfirmModal from '@components/ConfirmModal';
import DataTable from '@components/DataTable';
import KPICard from '@components/KPICard';
import LoanProgressBar from '@components/LoanProgressBar';
import PageHeader from '@components/PageHeader';
import { cancelLoan, createLoan } from '@api';
import { useCustomers } from '@hooks/useCustomers';
import { useDevices } from '@hooks/useDevices';
import { useLoans } from '@hooks/useLoans';
import { hasAction } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';
import { metricGridStyle } from '@/styles/layout';
import { useToast } from '@components/ToastProvider';

function formatCurrency(value) {
  return 'ZMW ' + (Number(value || 0) / 100).toFixed(2);
}

export default function Loans() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreateLoan = hasAction(user, 'loans.create');
  const canCancelLoan = hasAction(user, 'loans.cancel');
  const queryClient = useQueryClient();
  const query = useLoans();
  const customersQuery = useCustomers();
  const devicesQuery = useDevices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    deviceId: '',
    principalAmount: '',
    downPayment: '',
    interestRate: '12',
    termMonths: '12',
    gracePeriodDays: '5',
    startDate: new Date().toISOString().slice(0, 10)
  });

  const mutation = useMutation({
    mutationFn: createLoan,
    onSuccess: () => {
      setError('');
      setForm({
        customerId: '',
        deviceId: '',
        principalAmount: '',
        downPayment: '',
        interestRate: '12',
        termMonths: '12',
        gracePeriodDays: '5',
        startDate: new Date().toISOString().slice(0, 10)
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast({
        type: 'success',
        title: 'Loan created',
        message: 'The loan is now available for repayment tracking.'
      });
    },
    onError: (requestError) => {
      setError(requestError.response?.data?.message || 'Unable to create loan.');
      showToast({
        type: 'error',
        title: 'Create loan failed',
        message: requestError.response?.data?.message || 'Unable to create loan.'
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (loanId) => cancelLoan(loanId),
    onSuccess: () => {
      setPendingCancellation(null);
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast({
        type: 'success',
        title: 'Loan cancelled',
        message: 'The device is now free for a new assignment.'
      });
    },
    onError: (requestError) => {
      showToast({
        type: 'error',
        title: 'Cancel loan failed',
        message: requestError.response?.data?.message || 'Unable to cancel the loan.'
      });
    }
  });

  const rows = (query.data || []).map(function toRow(loan) {
    const cancelable = loan.status === 'active' || loan.status === 'defaulted';

    return {
      id: loan.id,
      customerId: loan.customerId,
      customerName: loan.customer?.fullName || 'Unknown customer',
      deviceName: loan.device ? loan.device.brand + ' ' + loan.device.model : 'Unassigned device',
      status: loan.status,
      principalAmount: formatCurrency(loan.principalAmount),
      monthlyPayment: formatCurrency(loan.monthlyPayment),
      progress: loan.id,
      paid: Number(loan.amountPaid),
      total: Number(loan.totalPayable),
      balance: formatCurrency(Math.max(Number(loan.totalPayable || 0) - Number(loan.amountPaid || 0), 0)),
      cancelable
    };
  });

  const stats = useMemo(() => {
    const loans = query.data || [];
    return {
      total: loans.length,
      active: loans.filter((loan) => loan.status === 'active').length,
      outstanding: formatCurrency(loans.reduce((sum, loan) => sum + Math.max(Number(loan.totalPayable || 0) - Number(loan.amountPaid || 0), 0), 0))
    };
  }, [query.data]);

  const availableDevices = useMemo(() => {
    return (devicesQuery.data || []).filter(function filterDevice(device) {
      const matchesCustomer = !form.customerId || device.customerId === form.customerId;
      const hasActiveLoan = (query.data || []).some(function someLoan(loan) {
        return loan.deviceId === device.id && ['active', 'defaulted'].includes(loan.status);
      });

      return matchesCustomer && !hasActiveLoan;
    });
  }, [devicesQuery.data, form.customerId, query.data]);

  function updateField(key, value) {
    setForm((current) => {
      if (key === 'customerId') {
        return {
          ...current,
          customerId: value,
          deviceId: ''
        };
      }

      return {
        ...current,
        [key]: value
      };
    });
  }

  function handleCreateLoan() {
    setError('');

    if (!form.customerId || !form.deviceId || !form.principalAmount || !form.interestRate || !form.termMonths) {
      setError('Customer, device, principal amount, interest rate, and term are required.');
      return;
    }

    mutation.mutate({
      ...form,
      principalAmount: Number(form.principalAmount),
      downPayment: Number(form.downPayment || 0),
      interestRate: Number(form.interestRate),
      termMonths: Number(form.termMonths),
      gracePeriodDays: Number(form.gracePeriodDays || 5)
    });
  }

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Loan Origination"
        title="Loan book"
        subtitle="Create financed agreements directly from the dashboard and keep each loan connected to its assigned device and customer profile."
        actionLabel={canCreateLoan ? 'Create loan' : null}
        onAction={canCreateLoan ? () => {
          setError('');
          setIsModalOpen(true);
        } : undefined}
      />

      <div style={styles.metrics}>
        <KPICard label="Total Loans" value={stats.total} />
        <KPICard label="Active Loans" value={stats.active} accent="#16a34a" />
        <KPICard label="Outstanding Balance" value={stats.outstanding} accent="#0ea5e9" />
      </div>

      <DataTable
        columns={[
          { key: 'customerName', label: 'Customer' },
          { key: 'deviceName', label: 'Device' },
          { key: 'status', label: 'Status' },
          { key: 'principalAmount', label: 'Principal' },
          { key: 'monthlyPayment', label: 'Monthly Payment' },
          { key: 'balance', label: 'Balance' },
          {
            key: 'progress',
            label: 'Progress',
            render: (row) => <LoanProgressBar paid={row.paid} total={row.total} />
          },
          {
            key: 'cancelable',
            label: 'Action',
            render: (row) => (
              row.cancelable ? (
                <button
                  type="button"
                  style={{ ...styles.cancelButton, ...(canCancelLoan ? null : styles.cancelButtonDisabled) }}
                  onClick={() => setPendingCancellation(row.id)}
                  disabled={!canCancelLoan}
                >
                  Cancel loan
                </button>
              ) : 'Closed'
            )
          }
        ]}
        rows={rows}
      />

      <ActionModal
        isOpen={isModalOpen}
        title="Create loan"
        subtitle="The backend calculates the repayment schedule automatically using the financed amount and interest rate."
        submitLabel="Create loan"
        loading={mutation.isPending}
        error={error}
        success=""
        onClose={() => {
          setIsModalOpen(false);
          setError('');
        }}
        onSubmit={handleCreateLoan}
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
            <label style={modalFormStyles.label}>Device</label>
            <select style={modalFormStyles.input} value={form.deviceId} onChange={(event) => updateField('deviceId', event.target.value)}>
              <option value="">Select device</option>
              {availableDevices.map(function renderDevice(device) {
                return <option key={device.id} value={device.id}>{device.brand} {device.model}</option>;
              })}
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Principal amount (ZMW)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="0.01" value={form.principalAmount} onChange={(event) => updateField('principalAmount', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Down payment (ZMW)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="0.01" value={form.downPayment} onChange={(event) => updateField('downPayment', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Interest rate (%)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="0.01" value={form.interestRate} onChange={(event) => updateField('interestRate', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Term (months)</label>
            <input style={modalFormStyles.input} type="number" min="1" step="1" value={form.termMonths} onChange={(event) => updateField('termMonths', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Grace period (days)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="1" value={form.gracePeriodDays} onChange={(event) => updateField('gracePeriodDays', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Start date</label>
            <input style={modalFormStyles.input} type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
          </div>
        </div>
      </ActionModal>

      <ConfirmModal
        isOpen={Boolean(pendingCancellation)}
        title="Cancel loan"
        message="Cancelling this loan will free the device for a new loan assignment and stop the current repayment schedule."
        confirmLabel="Cancel loan"
        danger
        loading={cancelMutation.isPending}
        onCancel={() => setPendingCancellation(null)}
        onConfirm={() => cancelMutation.mutate(pendingCancellation)}
      />
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    ...metricGridStyle
  },
  cancelButton: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer'
  },
  cancelButtonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed'
  }
};
