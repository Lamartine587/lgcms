// auth.js - Updated to match backend API routes

async function login(email, password, role, redirectUrl) {
  try {
    // Correct endpoint based on your backend routes
    const endpoint = role === 'admin' ? '/api/admin/login' : '/api/users/login';
    
    const response = await apiRequest(endpoint, 'POST', { email, password });
    
    if (!response.token) {
      throw new Error('Login failed: No token received');
    }
    
    setToken(response.token);
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Login error:', error);
    displayError(
      error.message.includes('401') 
        ? 'Invalid email or password' 
        : error.message || 'Login failed. Please try again.',
      '.auth-card'
    );
  }
}

async function register(userData, role, redirectUrl) {
  try {
    // Correct endpoint based on your backend routes
    const endpoint = role === 'admin' ? '/api/admin/register' : '/api/users/register';
    
    const response = await apiRequest(endpoint, 'POST', userData);
    
    if (!response.token) {
      throw new Error('Registration failed: No token received');
    }
    
    setToken(response.token);
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate email error specifically
    const errorMsg = error.message.includes('11000') 
      ? 'Email already registered'
      : error.message || 'Registration failed. Please try again.';
    
    displayError(errorMsg, '.auth-card');
  }
}

async function logout(redirectUrl = '/') {
  try {
    const token = getToken();
    if (token) {
      // Try to call logout API if token exists
      await apiRequest('/api/auth/logout', 'POST');
    }
  } catch (error) {
    console.error('Logout API error:', error);
    // Continue with logout even if API call fails
  } finally {
    removeToken();
    window.location.href = redirectUrl;
  }
}

// Utility function to check authentication status
async function checkAuth(requiredRole) {
  try {
    const token = getToken();
    if (!token) return false;

    const response = await apiRequest('/api/auth/check', 'GET');
    
    if (!response.success || (requiredRole && response.data.role !== requiredRole)) {
      removeToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    removeToken();
    return false;
  }
}

// Display error message in the specified container
function displayError(message, containerSelector = 'body') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Remove any existing error messages
  const existingError = container.querySelector('.auth-error');
  if (existingError) existingError.remove();

  // Create and display new error message
  const errorElement = document.createElement('div');
  errorElement.className = 'auth-error alert alert-error';
  errorElement.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>${message}</span>
  `;

  // Insert error message at the top of the container
  container.insertBefore(errorElement, container.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}