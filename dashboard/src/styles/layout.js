export const DASHBOARD_LAYOUT = {
  sidebarWidth: '208px',
  contentMaxWidth: '1600px',
  metricGridMaxWidth: '1160px'
};

export const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '12px',
  width: '100%',
  maxWidth: DASHBOARD_LAYOUT.metricGridMaxWidth
};
