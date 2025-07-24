// admin.js - Updated to match backend routes

document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on the admin dashboard page
    if (window.location.pathname.includes('admin-dashboard.html')) {
        try {
            await loadAdminDashboard();
            
            // Set up search and filter functionality
            document.getElementById('admin-search').addEventListener('input', filterAdminComplaints);
            document.getElementById('admin-filter').addEventListener('change', filterAdminComplaints);
            
        } catch (error) {
            console.error('Admin dashboard initialization failed:', error);
            displayMessage(
                document.getElementById('admin-dashboard-error'), 
                'Failed to load dashboard data. Please try again later.', 
                true
            );
        }
    }
});

async function loadAdminDashboard() {
    const complaintsList = document.getElementById('admin-complaints-list');
    const errorElement = document.getElementById('admin-dashboard-error');
    
    // Show loading state
    complaintsList.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading dashboard data...
        </div>
    `;
    errorElement.textContent = '';
    
    try {
        // Fetch both complaints and statistics in parallel
        const [complaintsResponse, statsResponse] = await Promise.all([
            apiCall('/complaints'),
            apiCall('/complaints/stats')  // Changed from '/complaints/statistics'
        ]);
        
        // Update statistics display
        updateDashboardStats(statsResponse);
        
        // Update complaints list
        if (complaintsResponse.length === 0) {
            complaintsList.innerHTML = '<p class="no-complaints">No complaints found in the system.</p>';
        } else {
            renderComplaintsList(complaintsResponse, true);
        }
        
    } catch (error) {
        console.error('Failed to load admin dashboard data:', error);
        complaintsList.innerHTML = '';
        displayMessage(errorElement, error.message || 'Failed to load dashboard data', true);
        
        // If it's an authentication error, redirect to login
        if (error.message.includes('Unauthorized') || error.message.includes('token')) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    }
}

function updateDashboardStats(stats) {
    if (!stats) {
        console.error('No statistics data received');
        return;
    }
    
    // Update the statistics cards
    document.getElementById('stat-total').textContent = stats.totalComplaints || 0;
    document.getElementById('stat-submitted').textContent = stats.statusBreakdown?.submitted || 0;
    document.getElementById('stat-in-review').textContent = stats.statusBreakdown?.inReview || 0;
    document.getElementById('stat-resolved').textContent = stats.statusBreakdown?.resolved || 0;
    document.getElementById('stat-rejected').textContent = stats.statusBreakdown?.rejected || 0;
    
    // Update most common issues
    const commonIssuesList = document.getElementById('stat-common-issues');
    commonIssuesList.innerHTML = '';
    
    if (stats.mostCommonIssues?.length > 0) {
        stats.mostCommonIssues.forEach(issue => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="issue-category">${issue._id || 'Unknown'}:</span>
                <span class="issue-count">${issue.count || 0}</span>
            `;
            commonIssuesList.appendChild(li);
        });
    } else {
        commonIssuesList.innerHTML = '<li>No common issues data available</li>';
    }
}

function renderComplaintsList(complaints, isAdmin = false) {
    const complaintsList = document.getElementById('admin-complaints-list');
    
    complaintsList.innerHTML = complaints.map(complaint => `
        <div class="complaint-card" data-id="${complaint._id}" data-status="${complaint.status}">
            <h3>
                ${complaint.category || 'No Category'}
                <span class="status-badge" data-status="${complaint.status}">
                    ${complaint.status || 'Unknown'}
                </span>
            </h3>
            <p><strong>Description:</strong> ${complaint.description || 'No description'}</p>
            <p><strong>Location:</strong> ${complaint.location || 'Not specified'}</p>
            ${isAdmin ? `
                <p><strong>Citizen:</strong> ${complaint.citizen?.username || 'N/A'}</p>
                <p><strong>Submitted:</strong> ${complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : 'Unknown date'}</p>
            ` : ''}
            <a href="/complaint-detail.html?id=${complaint._id}" class="view-detail-btn">
                <i class="fas fa-eye"></i> View Details
            </a>
        </div>
    `).join('');
}

function filterAdminComplaints() {
    const searchTerm = document.getElementById('admin-search').value.toLowerCase();
    const filterValue = document.getElementById('admin-filter').value;
    const complaintsList = document.getElementById('admin-complaints-list');
    const allComplaintCards = Array.from(complaintsList.querySelectorAll('.complaint-card'));
    
    allComplaintCards.forEach(card => {
        const statusMatches = filterValue === 'all' || card.dataset.status === filterValue;
        const searchMatches = searchTerm === '' || 
            card.textContent.toLowerCase().includes(searchTerm);
        
        card.style.display = (statusMatches && searchMatches) ? '' : 'none';
    });
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('lgcms_token')}`
    };
    
    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };
    
    const response = await fetch(`/api${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
}

function displayMessage(element, message, isError = false) {
    if (!element) return;
    
    element.textContent = message;
    element.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}