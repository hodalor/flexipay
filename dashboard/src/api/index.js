import client from '@api/client';

export async function login(payload) {
  const response = await client.post('/auth/login', payload);
  return response.data.data;
}

export async function createCustomer(payload) {
  const response = await client.post('/auth/register', payload);
  return response.data.data;
}

export async function getCustomers() {
  const response = await client.get('/customers');
  return response.data.data;
}

export async function getCustomer(id) {
  const response = await client.get('/customers/' + id);
  return response.data.data;
}

export async function getDevices() {
  const response = await client.get('/devices');
  return response.data.data;
}

export async function enrollDevice(payload) {
  const response = await client.post('/devices/enroll', payload);
  return response.data.data;
}

export async function lockDevice(id, reason) {
  const response = await client.post('/devices/' + id + '/lock', { reason });
  return response.data.data;
}

export async function unlockDevice(id) {
  const response = await client.post('/devices/' + id + '/unlock', {});
  return response.data.data;
}

export async function getLoans() {
  const response = await client.get('/loans');
  return response.data.data;
}

export async function createLoan(payload) {
  const response = await client.post('/loans', payload);
  return response.data.data;
}

export async function cancelLoan(id) {
  const response = await client.post('/loans/' + id + '/cancel', {});
  return response.data.data;
}

export async function getLoanSchedule(id) {
  const response = await client.get('/loans/' + id + '/schedule');
  return response.data.data;
}

export async function getPaymentsForLoan(id) {
  const response = await client.get('/loans/' + id + '/payments');
  return response.data.data;
}

export async function initiatePayment(payload) {
  const response = await client.post('/payments/initiate', payload);
  return response.data.data;
}

export async function getPayments() {
  const response = await client.get('/payments');
  return response.data.data;
}

export async function recordManualPayment(payload) {
  const response = await client.post('/payments/manual-record', payload);
  return response.data.data;
}

export async function submitDirectorReview(id, payload) {
  const response = await client.post('/payments/' + id + '/director-review', payload);
  return response.data.data;
}

export async function submitManagerReview(id, payload) {
  const response = await client.post('/payments/' + id + '/manager-review', payload);
  return response.data.data;
}

export async function getAdminUsers() {
  const response = await client.get('/admin-users');
  return response.data.data;
}

export async function createAdminUser(payload) {
  const response = await client.post('/admin-users', payload);
  return response.data.data;
}

export async function updateAdminUser(id, payload) {
  const response = await client.put('/admin-users/' + id, payload);
  return response.data.data;
}
