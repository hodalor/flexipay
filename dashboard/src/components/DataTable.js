import React, { useMemo, useState } from 'react';

export default function DataTable({ columns, rows }) {
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [sortOrder, setSortOrder] = useState('asc');

  const sortedRows = useMemo(() => {
    return [...rows].sort(function sortRows(left, right) {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue > rightValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }

      return sortOrder === 'asc' ? -1 : 1;
    });
  }, [rows, sortKey, sortOrder]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(key);
    setSortOrder('asc');
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.scroller}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(function renderHead(column) {
                return (
                  <th key={column.key} style={styles.head} onClick={() => handleSort(column.key)}>
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length ? sortedRows.map(function renderRow(row) {
              return (
                <tr key={row.id} style={styles.row}>
                  {columns.map(function renderCell(column) {
                    return <td key={column.key} style={styles.cell}>{column.render ? column.render(row) : row[column.key]}</td>;
                  })}
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={columns.length} style={styles.emptyCell}>No records yet. Create the first one from the action button.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    background: 'rgba(15, 23, 42, 0.72)',
    borderRadius: '22px',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    boxShadow: '0 24px 60px rgba(2, 6, 23, 0.22)'
  },
  scroller: {
    width: '100%',
    maxWidth: '100%',
    overflowX: 'auto',
    overflowY: 'hidden'
  },
  table: {
    width: 'max-content',
    minWidth: '100%',
    borderCollapse: 'collapse'
  },
  head: {
    textAlign: 'left',
    padding: '16px 18px',
    background: 'rgba(15, 23, 42, 0.95)',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    position: 'sticky',
    top: 0
  },
  row: {
    background: 'transparent'
  },
  cell: {
    padding: '16px 18px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    color: '#e2e8f0',
    verticalAlign: 'top',
    overflowWrap: 'anywhere'
  },
  emptyCell: {
    padding: '26px 18px',
    color: '#94a3b8',
    textAlign: 'center'
  }
};
