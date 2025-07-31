// public/assets/js/admin/dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
  const totalUsers = document.getElementById('total-users');
  const activeComplaints = document.getElementById('active-complaints');
  const resolvedCases = document.getElementById('resolved-cases');
  const avgResolutionTime = document.getElementById('avg-resolution-time');
  const recentActivity = document.getElementById('recent-activity');
  const statusChartCanvas = document.getElementById('status-chart');
  const trendsChartCanvas = document.getElementById('trends-chart');
  const departmentChartCanvas = document.getElementById('department-chart');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  // Add loading state to dashboard cards
  // Check if the element exists and has a parent with 'dashboard-card' class
  [totalUsers, activeComplaints, resolvedCases, avgResolutionTime, statusChartCanvas, trendsChartCanvas, departmentChartCanvas].forEach(function(el) {
    if (el) {
        const card = el.closest('.dashboard-card'); // Use the specific class dashboard-card
        if (card) {
            card.classList.add('opacity-50', 'animate-pulse');
        }
    }
  });

  // Sidebar toggle
  if (sidebarToggle && sidebar) { // Ensure elements exist
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('-translate-x-full');
      // Adjust main content margin based on sidebar state
      const mainContent = document.querySelector('main');
      if (mainContent) {
          mainContent.classList.toggle('lg:ml-0'); // Toggle margin
      }
    });
  }

  // Define generateInviteCode globally (by attaching to window) so onclick can find it
  // This is the key fix for "generateInviteCode is not defined"
  window.generateInviteCode = async function() {
    try {
      // Assuming getToken is available from shared/auth.js
      const token = getToken();
      if (!token) {
        window.location.href = '/admin/login.html';
        return;
      }

      // Assuming adminApiRequest is available from shared/api.js
      const response = await adminApiRequest('/generate-invite', 'POST', {}, token);

      if (response.success) {
        alert(`New Invite Code Generated: ${response.data.code}\nExpires: ${new Date(response.data.expiresAt).toLocaleString()}`);
        // Optionally, update the UI to show the new code or refresh a list of codes
      } else {
        displayError(response.message || 'Failed to generate invite code.');
      }
    } catch (error) {
      console.error("Error generating invite code:", error);
      displayError(error.message || 'An error occurred while generating invite code.');
    }
  };


  try {
    // Check authentication using adminApiRequest (from shared/api.js)
    // Assuming adminApiRequest is a global function or imported
    const authStatus = await adminApiRequest('/auth/check', 'GET');
    if (!authStatus || !authStatus.success) {
      window.location.href = '/admin/login.html';
      return;
    }

    // Fetch dashboard stats using adminApiRequest
    const stats = await adminApiRequest('/stats', 'GET');
    
    // Ensure data exists before accessing properties
    if (stats.success && stats.data) {
        // Update quick stats
        if (totalUsers) totalUsers.textContent = stats.data.totalUsers || 0;
        if (activeComplaints) activeComplaints.textContent = stats.data.activeComplaints || 0;
        if (resolvedCases) resolvedCases.textContent = stats.data.resolvedCases || 0;

        // Use avgResolutionTime directly from the backend response and display as 'days'
        if (avgResolutionTime) {
            avgResolutionTime.textContent = stats.data.avgResolutionTime ? `${stats.data.avgResolutionTime} days` : 'N/A';
        }

        // Fetch recent activity
        if (recentActivity && stats.data.recentActivity) {
            if (stats.data.recentActivity.length > 0) {
                recentActivity.innerHTML = stats.data.recentActivity.map(function(activity) {
                  return `
                    <li class="list-group-item hover:bg-gray-100 p-2 border-b last:border-b-0">
                      <span class="font-semibold text-blue-700">${activity.type}:</span> ${activity.description} at ${new Date(activity.timestamp).toLocaleString()}
                    </li>
                  `;
                }).join('');
            } else {
                recentActivity.innerHTML = '<li class="p-2 text-gray-500">No recent activity.</li>';
            }
        }

        // Check if Chart.js is loaded before trying to create charts
        if (typeof Chart !== 'undefined') {
            // Fetch charts data using adminApiRequest
            const statusData = await adminApiRequest('/ml/complaint_status_distribution', 'GET');
            if (statusChartCanvas && statusData.success && statusData.data) {
                new Chart(statusChartCanvas, {
                  type: statusData.data.type,
                  data: statusData.data.data,
                  options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } } 
                  }
                });
            }

            const trendsData = await adminApiRequest('/ml/complaint_trends', 'GET');
            if (trendsChartCanvas && trendsData.success && trendsData.data) {
                new Chart(trendsChartCanvas, {
                  type: trendsData.data.type,
                  data: trendsData.data.data,
                  options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } } 
                  }
                });
            }

            // For the "Department Chart" (now Complaint Category Distribution)
            const deptData = await adminApiRequest('/ml/complaint_category_distribution', 'GET');
            if (departmentChartCanvas && deptData.success && deptData.data) {
                new Chart(departmentChartCanvas, {
                  type: deptData.data.type,
                  data: deptData.data.data,
                  options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } } 
                  }
                });
            }
        } else {
            console.error("Chart.js library not loaded. Charts will not be displayed.");
        }

    } else {
        // Assuming displayError is a global utility from utils.js
        displayError(stats.message || "Failed to load dashboard data.");
    }

    // Remove loading state from dashboard cards
    [totalUsers, activeComplaints, resolvedCases, avgResolutionTime, statusChartCanvas, trendsChartCanvas, departmentChartCanvas].forEach(function(el) {
      if (el) { // Check if element exists
          const card = el.closest('.dashboard-card'); // Use the specific class dashboard-card
          if (card) {
              card.classList.remove('opacity-50', 'animate-pulse');
          }
      }
    });

  } catch (error) {
    console.error("Dashboard load error:", error);
    if (error.message && error.message.includes('401')) {
      window.location.href = '/admin/login.html';
    } else {
      // Display a user-friendly error message on the page
      // Assuming displayError is a global utility from utils.js
      displayError(error.message || 'An unexpected error occurred while loading dashboard data.');
    }
    // Also remove loading state on error to prevent indefinite loading animation
    [totalUsers, activeComplaints, resolvedCases, avgResolutionTime, statusChartCanvas, trendsChartCanvas, departmentChartCanvas].forEach(function(el) {
        if (el) {
            const card = el.closest('.dashboard-card');
            if (card) {
                card.classList.remove('opacity-50', 'animate-pulse');
            }
        }
    });
  }
});