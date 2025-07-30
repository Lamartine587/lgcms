const API_BASE_URL = 'http://localhost:5000/api';
const ML_API_BASE_URL = 'http://localhost:5001/api/ml';

async function apiRequest(endpoint, method = 'GET', data = null, token = null, isFormData = false) {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'API request failed');
  }
  return result;
}

async function mlApiRequest(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  const options = { method, headers };
  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${ML_API_BASE_URL}${endpoint}`, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'ML API request failed');
  }
  return result;
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function removeToken() {
  localStorage.removeItem('token');
}

function displayError(message, container = '.card') {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.textContent = message;
  document.querySelector(container)?.prepend(alert);
  setTimeout(() => alert.remove(), 3000);
}