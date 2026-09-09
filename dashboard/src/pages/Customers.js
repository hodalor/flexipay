import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '@components/DataTable';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { createCustomer } from '@api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomers } from '@hooks/useCustomers';
import { hasAction } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';
import { metricGridStyle } from '@/styles/layout';
import { useToast } from '@components/ToastProvider';

export default function Customers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreateCustomer = hasAction(user, 'customers.create');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    password: 'Password123!'
  });
  const [formError, setFormError] = useState('');
  const query = useCustomers();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      setFormError('');
      setForm({
        fullName: '',
        phone: '',
        email: '',
        nationalId: '',
        password: 'Password123!'
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      showToast({
        type: 'success',
        title: 'Customer created',
        message: 'The customer account is ready for device assignment and loans.'
      });
    },
    onError: (error) => {
      setFormError(error.response?.data?.message || 'Unable to create customer.');
      showToast({
        type: 'error',
        title: 'Create customer failed',
        message: error.response?.data?.message || 'Unable to create customer.'
      });
    }
  });

  const rows = useMemo(() => {
    return (query.data || []).filter(function filterCustomer(customer) {
      const value = search.toLowerCase();
      return !value
        || customer.fullName.toLowerCase().includes(value)
        || customer.phone.toLowerCase().includes(value)
        || customer.email.toLowerCase().includes(value);
    }).map(function toRow(customer) {
      const failedPayments = (customer.payments || []).filter((payment) => payment.status === 'failed').length;
      const risk = failedPayments >= 2 ? 'high' : failedPayments === 1 ? 'medium' : 'low';

      return {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
        risk,
        loans: (customer.loans || []).length,
        devices: (customer.devices || []).length,
        action: customer.id
      };
    });
  }, [query.data, search]);

  const stats = useMemo(() => {
    const customers = query.data || [];
    return {
      total: customers.length,
      active: customers.filter((customer) => customer.status === 'active').length,
      highRisk: customers.filter((customer) => (customer.payments || []).filter((payment) => payment.status === 'failed').length >= 2).length
    };
  }, [query.data]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleCreateCustomer() {
    setFormError('');

    if (!form.fullName || !form.phone || !form.email || !form.nationalId || !form.password) {
      setFormError('All customer fields are required.');
      return;
    }

    mutation.mutate(form);
  }

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Sales Operations"
        title="Customer pipeline"
        subtitle="Create customers, watch their loan risk profile, and move directly into device assignment and financing without leaving the dashboard."
        toolbarContent={(
          <input style={styles.search} placeholder="Search by name, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
        )}
        actionLabel={canCreateCustomer ? 'Create customer' : null}
        onAction={canCreateCustomer ? () => {
          setFormError('');
          setIsModalOpen(true);
        } : undefined}
      />

      <div style={styles.metrics}>
        <KPICard label="Customer Base" value={stats.total} />
        <KPICard label="Active Accounts" value={stats.active} accent="#16a34a" />
        <KPICard label="High Risk Profiles" value={stats.highRisk} accent="#f97316" />
      </div>

      <DataTable
        columns={[
          { key: 'fullName', label: 'Customer' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Status' },
          { key: 'devices', label: 'Devices' },
          { key: 'loans', label: 'Loans' },
          { key: 'risk', label: 'Risk Indicator' },
          {
            key: 'action',
            label: 'Action',
            render: (row) => <Link to={'/customers/' + row.action} style={styles.viewLink}>Open</Link>
          }
        ]}
        rows={rows}
      />

      <ActionModal
        isOpen={isModalOpen}
        title="Create customer"
        subtitle="This account can immediately log in on mobile after creation and auto-enroll a device from the app."
        submitLabel="Create customer"
        loading={mutation.isPending}
        error={formError}
        success=""
        onClose={() => {
          setIsModalOpen(false);
          setFormError('');
        }}
        onSubmit={handleCreateCustomer}
      >
        <div style={modalFormStyles.grid}>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Full name</label>
            <input style={modalFormStyles.input} value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Phone</label>
            <input style={modalFormStyles.input} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Email</label>
            <input style={modalFormStyles.input} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>National ID</label>
            <input style={modalFormStyles.input} value={form.nationalId} onChange={(event) => updateField('nationalId', event.target.value)} />
          </div>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Temporary password</label>
            <input style={modalFormStyles.input} type="text" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
            <div style={modalFormStyles.hint}>Give this to the customer for their first mobile sign-in.</div>
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
    ...metricGridStyle
  },
  search: {
    width: '320px',
    maxWidth: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.7)',
    color: '#f8fafc'
  },
  viewLink: {
    color: '#99f6e4',
    textDecoration: 'none',
    fontWeight: '700'
  }
};
