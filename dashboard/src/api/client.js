import axios from 'axios';

export function getApiBaseUrl() {
  return process.env.API_BASE_URL || 'http://localhost:4000/api';
}

export function getRealtimeUrl(token) {
  const apiBaseUrl = getApiBaseUrl().replace(/\/+$/, '');
  return apiBaseUrl + '/events/stream?token=' + encodeURIComponent(token || '');
}

const client = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000
});

client.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('flexipay.dashboard.token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

export default client;
