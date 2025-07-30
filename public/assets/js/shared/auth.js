async function login(email, password, role, redirectUrl) {
  try {
    const endpoint = role === 'admin' ? '/admin/login' : '/users/login';
    const data = await apiRequest(endpoint, 'POST', { email, password });
    setToken(data.token);
    window.location.href = redirectUrl;
  } catch (error) {
    displayError(error.message, '.auth-card');
  }
}

async function register(data, role, redirectUrl) {
  try {
    const endpoint = role === 'admin' ? '/admin/register' : '/users/register';
    const response = await apiRequest(endpoint, 'POST', data);
    setToken(response.token);
    window.location.href = redirectUrl;
  } catch (error) {
    displayError(error.message, '.auth-card');
  }
}

async function logout(role, redirectUrl) {
  try {
    const token = getToken();
    if (token && role === 'admin') {
      await apiRequest('/admin/logout', 'POST', null, token);
    }
    removeToken();
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Logout failed:', error);
    removeToken();
    window.location.href = redirectUrl;
  }
}