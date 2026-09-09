import React, { useEffect, useState } from 'react';
import PageHeader from '@components/PageHeader';
import { saveBrandingConfig, useBranding } from '@hooks/useBranding';
import { useToast } from '@components/ToastProvider';

const tabs = [
  { key: 'branding', label: 'Branding' },
  { key: 'platform', label: 'Platform' }
];

export default function Settings() {
  const { branding } = useBranding();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('branding');
  const [brandingForm, setBrandingForm] = useState(branding);
  const [brandingError, setBrandingError] = useState('');

  useEffect(() => {
    setBrandingForm(branding);
  }, [branding]);

  function updateField(key, value) {
    setBrandingForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleLogoUpload(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function onLoad() {
      updateField('logoDataUrl', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  }

  function handleSaveBranding() {
    setBrandingError('');

    if (!brandingForm.companyName.trim()) {
      setBrandingError('Company name is required.');
      showToast({
        type: 'warning',
        title: 'Branding incomplete',
        message: 'Enter the company name before saving the branding settings.'
      });
      return;
    }

    saveBrandingConfig({
      companyName: brandingForm.companyName.trim(),
      phone: brandingForm.phone.trim(),
      email: brandingForm.email.trim(),
      address: brandingForm.address.trim(),
      logoDataUrl: brandingForm.logoDataUrl || ''
    });

    showToast({
      type: 'success',
      title: 'Branding updated',
      message: 'The topbar and dashboard branding have been refreshed.'
    });
  }

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Platform Setup"
        title="Settings"
        subtitle="Manage company branding and the live dashboard environment from one place."
        actionLabel={activeTab === 'branding' ? 'Save branding' : null}
        onAction={activeTab === 'branding' ? handleSaveBranding : undefined}
      />

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={{ ...styles.tab, ...(activeTab === tab.key ? styles.tabActive : null) }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' ? (
        <div style={styles.brandingLayout}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Company profile</h3>
            <p style={styles.cardText}>The saved company name replaces the repeated page title in the topbar and becomes the shared dashboard brand.</p>
            {brandingError ? <div style={styles.error}>{brandingError}</div> : null}
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Company name</label>
                <input style={styles.input} value={brandingForm.companyName} onChange={(event) => updateField('companyName', event.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={brandingForm.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={brandingForm.email} onChange={(event) => updateField('email', event.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Address</label>
                <input style={styles.input} value={brandingForm.address} onChange={(event) => updateField('address', event.target.value)} />
              </div>
              <div style={{ ...styles.field, ...styles.fieldFull }}>
                <label style={styles.label}>Upload logo</label>
                <input style={styles.fileInput} type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Brand preview</h3>
            <div style={styles.previewCard}>
              {brandingForm.logoDataUrl ? <img src={brandingForm.logoDataUrl} alt={brandingForm.companyName} style={styles.previewLogo} /> : <div style={styles.previewLogoFallback}>No logo</div>}
              <div style={styles.previewName}>{brandingForm.companyName || 'FlexiPay'}</div>
              <div style={styles.previewMeta}>{brandingForm.email || 'Email not set'}</div>
              <div style={styles.previewMeta}>{brandingForm.phone || 'Phone not set'}</div>
              <div style={styles.previewMeta}>{brandingForm.address || 'Address not set'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.platformGrid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Dashboard wiring</h3>
            <p style={styles.cardText}>Set `API_BASE_URL` in the dashboard environment so every page keeps talking to the backend API with the stored auth token.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Mobile communication</h3>
            <p style={styles.cardText}>After customer sign-in, the mobile app auto-enrolls its device and starts syncing lock state through the backend device endpoints.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Desktop communication</h3>
            <p style={styles.cardText}>Desktop heartbeat uses device credentials to poll device status and apply restrictions. Registering a device from the dashboard prepares that flow.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Persistence limits</h3>
            <p style={styles.cardText}>Desktop persistence survives restart and startup registration, but full survival across a factory reset still depends on imaging or enterprise device management.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  tabs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  tab: {
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.62)',
    color: '#cbd5e1',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer'
  },
  tabActive: {
    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(15, 118, 110, 0.18) 100%)',
    color: '#fff',
    borderColor: 'rgba(94, 234, 212, 0.28)'
  },
  brandingLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
    gap: '16px'
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px'
  },
  card: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.68) 100%)',
    borderRadius: '22px',
    padding: '22px',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    display: 'grid',
    gap: '16px'
  },
  cardTitle: {
    margin: 0,
    color: '#f8fafc'
  },
  cardText: {
    margin: 0,
    color: '#94a3b8',
    lineHeight: 1.7
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px'
  },
  field: {
    display: 'grid',
    gap: '8px'
  },
  fieldFull: {
    gridColumn: '1 / -1'
  },
  label: {
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#f8fafc',
    padding: '13px 14px',
    outline: 'none'
  },
  fileInput: {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#f8fafc',
    padding: '10px 12px'
  },
  previewCard: {
    minHeight: '100%',
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    background: 'rgba(2, 6, 23, 0.64)',
    padding: '18px',
    display: 'grid',
    justifyItems: 'flex-start',
    gap: '10px'
  },
  previewLogo: {
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.16)'
  },
  previewLogoFallback: {
    width: '72px',
    height: '72px',
    borderRadius: '16px',
    border: '1px dashed rgba(148, 163, 184, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontSize: '12px'
  },
  previewName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: '22px'
  },
  previewMeta: {
    color: '#94a3b8',
    lineHeight: 1.6
  },
  error: {
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(127, 29, 29, 0.45)',
    color: '#fecaca'
  }
};
