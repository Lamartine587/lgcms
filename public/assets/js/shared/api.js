// api.js

const API_BASE_URL = 'http://localhost:5000'; // Your Node.js backend
const ADMIN_API_BASE_URL = `${API_BASE_URL}/api/admin`; // Node.js Admin routes
const ML_API_BASE_URL = 'http://localhost:5001/api/ml'; // Your Flask ML backend

// Auth token management (globally accessible)
function setToken(token) {
  localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function removeToken() {
  localStorage.removeItem('token');
}

/**
 * Internal helper function to make an asynchronous request to any API base URL.
 * Handles fetch logic, headers, token, and error parsing.
 * @param {string} url - The full URL for the request.
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @param {object|FormData|null} data - The request body data.
 * @param {boolean} isFormData - True if the data is FormData, false otherwise.
 */
async function _internalFetchApi(url, method = 'GET', data = null, isFormData = false) {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    credentials: 'include'
  };

  if (data) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (response.status === 204) {
      return { success: true, message: 'No Content' };
    }
    
    let result;
    try {
      result = await response.json();
    } catch (e) {
      if (response.ok) {
        return { success: true, message: await response.text() };
      }
      throw new Error(`Failed to parse JSON response: ${e.message}`);
    }
    
    if (!response.ok) {
      const errorMsg = result.message || 
                      result.error || 
                      `Request failed with status ${response.status}: ${response.statusText}`;
      
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }
    
    return result;
    
  } catch (error) {
    console.error(`API Request Error [${method} ${url}]:`, error);
    
    // Modified 401 handling - don't auto-redirect for staff routes
    if (error.status === 401 || error.message.includes('401 Unauthorized')) {
      removeToken();
      
      // Only redirect to admin login for admin routes
      if (url.includes('/api/admin/') && !window.location.pathname.includes('/admin/login.html')) {
        window.location.href = '/admin/login.html';
        throw new Error("Unauthorized: Redirecting to admin login.");
      }
      
      // For staff routes, just throw the error
      throw new Error(error.message || "Unauthorized");
    }
    
    throw error;
  }
}

/**
 * Public function to make asynchronous requests to the main Node.js API (e.g., public routes).
 * @param {string} endpoint - The API endpoint (e.g., '/login').
 * @param {string} method - The HTTP method.
 * @param {object|FormData|null} data - The request body data.
 * @param {boolean} isFormData - True if the data is FormData.
 */
async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  return _internalFetchApi(url, method, data, isFormData);
}

/**
 * Public function to make asynchronous requests to the Node.js Admin API routes.
 * @param {string} endpoint - The API endpoint (e.g., '/users').
 * @param {string} method - The HTTP method.
 * @param {object|FormData|null} data - The request body data.
 * @param {boolean} isFormData - True if the data is FormData.
 */
async function adminApiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const url = `${ADMIN_API_BASE_URL}${endpoint}`;
  return _internalFetchApi(url, method, data, isFormData);
}

/**
 * Public function to make asynchronous requests to the Flask ML API routes.
 * This is the function `analytics.js` expects.
 * @param {string} endpoint - The ML API endpoint (e.g., '/complaint_status_distribution').
 * @param {string} method - The HTTP method.
 * @param {object|FormData|null} data - The request body data.
 * @param {boolean} isFormData - True if the data is FormData.
 */
async function mlApiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const url = `${ML_API_BASE_URL}${endpoint}`;
  return _internalFetchApi(url, method, data, isFormData);
}

/**
 * Displays an error message to the user.
 * This function is also globally accessible.
 * @param {string} message - The error message to display.
 * @param {string} container - CSS selector for the container where the alert should be appended.
 */
function displayError(message, container = 'main') {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
  alert.setAttribute('role', 'alert');
  alert.innerHTML = `
    <strong class="font-bold mr-2">Error!</strong>
    <span class="block sm:inline">${message}</span>
    <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
      <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" onclick="this.parentElement.parentElement.remove();"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.103l-2.651 3.746a1.2 1.2 0 0 1-1.697-1.697l3.746-2.651-3.746-2.651a1.2 1.2 0 0 1 1.697-1.697L10 8.897l2.651-3.746a1.2 1.2 0 0 1 1.697 1.697L11.103 10l3.746 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
    </span>
  `;
  
  const target = document.querySelector(container);
  if (target) {
    target.prepend(alert);
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000); // Alert disappears after 5 seconds
  }
}
// Staff API methods
const staffApi = {
  login: async (email, password) => {
    try {
      const response = await apiRequest('/api/staff/login', 'POST', { email, password });
      
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', 'staff');
        if (response.data) {
          localStorage.setItem('userData', JSON.stringify(response.data));
        }
      }
      
      return response;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Invalid email or password');
      }
      console.error('Staff login error:', error);
      throw error;
    }
  },
  // Get staff profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/api/staff/me', 'GET');
      if (response.success) {
        localStorage.setItem('userData', JSON.stringify(response.data));
      }
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Get assigned complaints
  getAssignedComplaints: async (page = 1, limit = 10, status = '') => {
    try {
      const query = `page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`;
      return await apiRequest(`/api/staff/complaints?${query}`, 'GET');
    } catch (error) {
      console.error('Get complaints error:', error);
      throw error;
    }
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      return await apiRequest('/api/staff/dashboard', 'GET');
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }
};

// Add to your existing api object


// Global `api` object for other parts of your frontend that might use it
const api = {
    staff: staffApi,
  // Authentication methods (using apiRequest for main Node.js routes)
  login: function(email, password, role) {
  return apiRequest(`/${role}/login`, 'POST', { email, password })
    .then(response => {
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', role); // Store user role
      }
      return response;
    });
},
  getToken: function() {
    return localStorage.getItem('token');
  },
  
  setToken: function(token) {
    localStorage.setItem('token', token);
  },
  
  removeToken: function() {
    localStorage.removeItem('token');
  },
  
  register: function(userData, role) {
    return apiRequest(`/${role}/register`, 'POST', userData);
  },
  
  checkAuth: function() {
    return adminApiRequest('/auth/check', 'GET'); 
  },
  
  logout: function() {
    removeToken();
    return adminApiRequest('/auth/logout', 'POST'); // Assuming an admin logout endpoint
  },

  // Complaints (Admin specific, using adminApiRequest)
  getComplaints: function(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/complaints?${queryString}`, 'GET');
  },
  
  getComplaint: function(id) {
    return apiRequest(`/api/complaints/${id}`, 'GET');
  },
    createComplaint: function(complaintData, isAnonymous = false) {
    const endpoint = isAnonymous ? '/api/complaints/anonymous' : '/api/complaints';
    const usesFormData = complaintData instanceof FormData;
    return apiRequest(endpoint, 'POST', complaintData, usesFormData);
  },
  
  updateComplaintStatus: function(id, status) {
    return apiRequest(`/api/complaints/${id}/status`, 'PUT', { status });
  },
  
  // Users (Admin specific, using adminApiRequest)
  getUsers: function() {
    return adminApiRequest('/users', 'GET');
  },
  
  // Admin Dashboard Stats (using adminApiRequest)
  getDashboardStats: function() {
    return adminApiRequest('/stats', 'GET');
  },
  
  // Citizen Dashboard Stats (CORRECTED ENDPOINT)
  getCitizenDashboardStats: function() {
  return apiRequest('/api/users/dashboard-stats', 'GET'); // Note: Added '/api' prefix
},


  // Admin Tools (using adminApiRequest)
  generateInviteCode: function() {
    return adminApiRequest('/generate-invite', 'POST');
  },

  // ML/Analytics (using mlApiRequest for Flask ML routes)
  getStatusDistribution: function() {
    return mlApiRequest('/complaint_status_distribution', 'GET');
  },
  
  getComplaintTrends: function() {
    return mlApiRequest('/complaint_trends', 'GET');
  },
  
  getDepartmentDistribution: function() {
    return mlApiRequest('/complaint_department_distribution', 'GET');
  },
  
  predictResolutionTime: function(data) {
    return mlApiRequest('/predict/resolution_time', 'POST', data);
  },
  
  retrainModel: function() {
    return mlApiRequest('/retrain_model', 'POST');
  },

  getCategoryTrends: function() {
    return mlApiRequest('/complaint_category_trends', 'GET');
  },
  
  // New: Get data for heatmap
  getHeatmapData: function() {
    return mlApiRequest('/complaint_heatmap_data', 'GET');
  },
  // Complaint Categories API
  getComplaintCategories: function() {
    return apiRequest('/api/complaints/categories', 'GET');
  },

  // Complaint Departments API
  getComplaintDepartments: function() {
    return apiRequest('/api/complaints/departments', 'GET');
  },

  // Complaint Types API
  getComplaintTypes: function() {
    return apiRequest('/api/complaints/types', 'GET');
  },

  // Complaint Statuses API
  getComplaintStatuses: function() {
    return apiRequest('/api/complaints/statuses', 'GET');
  },

  // Complaint Priority Levels API
  getComplaintPriorities: function() {
    return apiRequest('/api/complaints/priorities', 'GET');
  },

  // Upload Evidence API
  uploadComplaintEvidence: function(complaintId, fileData) {
    const formData = new FormData();
    formData.append('file', fileData);
    return apiRequest(`/api/complaints/${complaintId}/evidence`, 'POST', formData, true);
  },

  // Get Complaint Evidence API
  getComplaintEvidence: function(complaintId) {
    return apiRequest(`/api/complaints/${complaintId}/evidence`, 'GET');
  },

  // Update Complaint Location API
  updateComplaintLocation: function(complaintId, locationData) {
    return apiRequest(`/api/complaints/${complaintId}/location`, 'PUT', locationData);
  },

  // Get Nearby Complaints API
  getNearbyComplaints: function(latitude, longitude, radius = 1000) {
    return apiRequest(`/api/complaints/nearby?lat=${latitude}&lon=${longitude}&radius=${radius}`, 'GET');
  },

  // Staff Complaints API
getAssignedComplaints: function(status = '') {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/api/complaints/assigned${query}`, 'GET');
},

  // Get Complaint Timeline API
  getComplaintTimeline: function(complaintId) {
    return apiRequest(`/api/complaints/${complaintId}/timeline`, 'GET');
  },

  // Add Complaint Comment API
  addComplaintComment: function(complaintId, comment) {
    return apiRequest(`/api/complaints/${complaintId}/comments`, 'POST', { comment });
  },
  // Update the login method
// Update the login method to handle staff login
login: function(email, password, role) {
  return apiRequest(`/api/${role}/login`, 'POST', { email, password })
    .then(response => {
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', role);
      }
      return response;
    });
},

// Staff-specific methods
getAssignedComplaints: function(status = '') {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/api/staff/complaints${query}`, 'GET');
},

getStaffDashboardStats: function() {
  return apiRequest('/api/staff/stats', 'GET');
},


checkStaffAuth: function() {
  return apiRequest('/api/staff/auth/check', 'GET');
},
  // Get Complaint Comments API
  getComplaintComments: function(complaintId) {
    return apiRequest(`/api/complaints/${complaintId}/comments`, 'GET');
  },

  // Complaint Voting API
  voteOnComplaint: function(complaintId, voteType) {
    return apiRequest(`/api/complaints/${complaintId}/vote`, 'POST', { voteType });
  },

  // Complaint Subscription API
  subscribeToComplaint: function(complaintId) {
    return apiRequest(`/api/complaints/${complaintId}/subscribe`, 'POST');
  },

  // Complaint Notification Settings API
  updateComplaintNotificationSettings: function(complaintId, settings) {
    return apiRequest(`/api/complaints/${complaintId}/notification-settings`, 'PUT', settings);
  },

  // Complaint Search API
  searchComplaints: function(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    return apiRequest(`/api/complaints/search?${params.toString()}`, 'GET');
  },

  // Complaint Export API
  exportComplaints: function(format = 'csv', filters = {}) {
    const params = new URLSearchParams({ format, ...filters });
    return apiRequest(`/api/complaints/export?${params.toString()}`, 'GET');
  },

  // Complaint Statistics API
  getComplaintStatistics: function(timeRange = '30d') {
    return apiRequest(`/api/complaints/stats?range=${timeRange}`, 'GET');
  },
    // Add this to the api object (before the closing })
  getReverseGeocode: function(latitude, longitude) {
    return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(response => response.json());
  },
  // In your api object, update the createComplaint method:
createComplaint: function(complaintData, isAnonymous = false) {
  const endpoint = isAnonymous ? '/complaints/anonymous' : '/complaints';
  const usesFormData = complaintData instanceof FormData;
  return apiRequest(endpoint, 'POST', complaintData, usesFormData);
}
};