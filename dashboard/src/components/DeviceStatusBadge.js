import React from 'react';

const colors = {
  active: '#16a34a',
  overdue: '#d97706',
  locked: '#dc2626',
  offline: '#6b7280'
};

export default function DeviceStatusBadge({ status }) {
  return (
    <span style={{
      padding: '7px 11px',
      borderRadius: '999px',
      background: (colors[status] || '#64748b') + '22',
      color: colors[status] || '#cbd5e1',
      textTransform: 'capitalize',
      border: '1px solid ' + ((colors[status] || '#64748b') + '44'),
      fontWeight: '700',
      fontSize: '12px'
    }}>
      {status}
    </span>
  );
}
