import { loadHeader, loadSidebar, loadFooter, requireAuth } from '/js/shared.js';

// Function to fetch and display citizen dashboard statistics
async function fetchCitizenDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = '/citizen/login.html';
            return;
        }

        const response = await fetch('/api/users/dashboard-stats', { // API endpoint for citizen dashboard stats
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch dashboard stats: ${response.status}`);
        }

        const data = await response.json(); // Assuming data directly contains stats

        // Update dashboard stats in HTML
        const totalComplaintsEl = document.getElementById('total-complaints');
        if (totalComplaintsEl) totalComplaintsEl.textContent = data.totalComplaints || 0;

        const pendingComplaintsEl = document.getElementById('pending-complaints');
        if (pendingComplaintsEl) pendingComplaintsEl.textContent = data.pendingComplaints || 0;

        const resolvedComplaintsEl = document.getElementById('resolved-complaints');
        if (resolvedComplaintsEl) resolvedComplaintsEl.textContent = data.resolvedComplaints || 0;

        const recentComplaintsList = document.getElementById('recent-complaints-list');
        if (recentComplaintsList) {
            recentComplaintsList.innerHTML = ''; // Clear previous entries
            if (data.recentComplaints && Array.isArray(data.recentComplaints) && data.recentComplaints.length > 0) {
                data.recentComplaints.forEach(complaint => {
                    const listItem = document.createElement('div');
                    listItem.className = 'activity-item'; // Reusing existing style
                    listItem.innerHTML = `
                        <p>${complaint.title} - <span class="status-badge ${complaint.status.toLowerCase().replace(' ', '_')}">${complaint.status}</span></p>
                        <small>${new Date(complaint.createdAt).toLocaleString()}</small>
                    `;
                    recentComplaintsList.appendChild(listItem);
                });
            } else {
                recentComplaintsList.innerHTML = '<p class="loading-text">No recent complaints found.</p>';
            }
        }

    } catch (error) {
        console.error('Error fetching citizen dashboard stats:', error);
        const dashboardStatsContainer = document.querySelector('.dashboard-metrics-grid');
        if (dashboardStatsContainer) {
            dashboardStatsContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to load dashboard data. Please try again later.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    requireAuth('citizen'); // Ensure the user is logged in as a citizen

    loadHeader();
    loadSidebar(); // Load citizen sidebar
    loadFooter();

    fetchCitizenDashboardStats(); // Fetch and display dashboard stats
    console.log('Citizen Dashboard loaded.');
});
