import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '@api';

function formatCurrency(value) {
  return 'ZMW ' + (Number(value || 0) / 100).toFixed(2);
}

function looksLikeFallbackIdentifier(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return false;
  }

  return normalized.startsWith('FXP-DESKTOP-')
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
}

function formatDeviceIdentifier(device) {
  if (device.imei) {
    return 'IMEI: ' + device.imei;
  }

  if (device.serialNumber) {
    return (looksLikeFallbackIdentifier(device.serialNumber) ? 'Fallback Device ID: ' : 'Hardware Serial: ') + device.serialNumber;
  }

  return 'IMEI / Serial: -';
}

export default function CustomerDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id)
  });

  const customer = query.data;

  if (!customer) {
    return <div>Loading customer profile...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>{customer.fullName}</h2>
        <p>{customer.email}</p>
        <p>{customer.phone}</p>
      </div>
      <div style={styles.section}>
        <h3>Loans</h3>
        {(customer.loans || []).map((loan) => (
          <div key={loan.id} style={styles.item}>
            Loan {loan.id} | Status: {loan.status} | Amount paid: {formatCurrency(loan.amountPaid)}
          </div>
        ))}
      </div>
      <div style={styles.section}>
        <h3>Devices</h3>
        {(customer.devices || []).map((device) => (
          <div key={device.id} style={styles.item}>
            {(device.deviceCode || '-') + ' | ' + device.brand + ' ' + device.model} | {device.type} | {device.isLocked ? 'Locked' : 'Active'} | {formatDeviceIdentifier(device)}
          </div>
        ))}
      </div>
      <div style={styles.section}>
        <h3>Payments</h3>
        {(customer.payments || []).map((payment) => (
          <div key={payment.id} style={styles.item}>
            {payment.reference} | {formatCurrency(payment.amount)} | {payment.status}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '16px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '20px'
  },
  section: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '20px'
  },
  item: {
    padding: '12px 0',
    borderTop: '1px solid #e2e8f0'
  }
};
