import React from 'react';

export default function LoanProgressBar({ paid, total }) {
  const ratio = total > 0 ? Math.min(paid / total, 1) : 0;

  return (
    <div style={styles.track}>
      <div style={{ ...styles.fill, width: ratio * 100 + '%' }} />
    </div>
  );
}

const styles = {
  track: {
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    background: '#e2e8f0'
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    background: '#0f766e'
  }
};

