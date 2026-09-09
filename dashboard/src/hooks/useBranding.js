import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'flexipay.dashboard.branding';

const defaultBranding = {
  companyName: 'FlexiPay',
  phone: '',
  email: '',
  address: '',
  logoDataUrl: ''
};

function readBranding() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultBranding;
    }

    return {
      ...defaultBranding,
      ...JSON.parse(raw)
    };
  } catch (error) {
    return defaultBranding;
  }
}

export function saveBrandingConfig(nextBranding) {
  const branding = {
    ...defaultBranding,
    ...nextBranding
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  window.dispatchEvent(new CustomEvent('flexipay-branding-change', { detail: branding }));

  return branding;
}

export function useBranding() {
  const [branding, setBranding] = useState(() => readBranding());

  useEffect(() => {
    function handleBrandingChange(event) {
      setBranding(event.detail || readBranding());
    }

    function handleStorage(event) {
      if (event.key === STORAGE_KEY) {
        setBranding(readBranding());
      }
    }

    window.addEventListener('flexipay-branding-change', handleBrandingChange);
    window.addEventListener('storage', handleStorage);

    return function cleanup() {
      window.removeEventListener('flexipay-branding-change', handleBrandingChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return useMemo(() => ({
    branding,
    saveBranding: saveBrandingConfig,
    defaultBranding
  }), [branding]);
}
