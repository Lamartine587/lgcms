// public/js/admin.js

// Admin Dashboard Functions
export async function fetchDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = '/admin/login.html';
            return;
        }

        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch stats: ${response.status}`);
        }

        const data = await response.json().then(res => res.data); // Access the 'data' property

        // Update dashboard stats
        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) totalUsersEl.textContent = data.totalUsers || 0;

        const activeComplaintsEl = document.getElementById('active-complaints');
        if (activeComplaintsEl) activeComplaintsEl.textContent = data.activeComplaints || 0;

        const resolvedCasesEl = document.getElementById('resolved-cases');
        if (resolvedCasesEl) resolvedCasesEl.textContent = data.resolvedCases || 0;

        const todayActivityEl = document.getElementById('today-activity'); // For 'Today's Activity'
        if (todayActivityEl) todayActivityEl.textContent = data.todayActivity || 0;

        // Populate recent activity
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            activityList.innerHTML = ''; // Clear previous activity
            if (data.recentActivity && Array.isArray(data.recentActivity)) {
                if (data.recentActivity.length === 0) {
                    activityList.innerHTML = '<p class="loading-text">No recent activity found.</p>';
                } else {
                    data.recentActivity.forEach(activity => {
                        const item = document.createElement('div');
                        item.className = 'activity-item';
                        item.innerHTML = `
                            <p>${activity.description}</p>
                            <small>${activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'N/A'}</small>
                        `;
                        activityList.appendChild(item);
                    });
                }
            } else {
                activityList.innerHTML = '<p class="loading-text">Error loading activity or no activity data.</p>';
                console.warn('recentActivity data is missing or not an array.');
            }
        } else {
            console.warn('Activity list element not found.');
        }

        // Charts section - this part is now removed from dashboard.html
        // If you were to re-add charts to dashboard.html, you'd need Chart.js back
        // and this code would be relevant again.
        // For now, these elements will simply not be rendered or updated.

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            activityList.innerHTML = '<p class="loading-text" style="color: red;">Failed to load dashboard data.</p>';
        }
    }
}

// User Management Functions
export async function loadUsers(page = 1) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = '/admin/login.html';
            return;
        }

        const response = await fetch(`/api/admin/users?page=${page}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to load users: ${response.status}`);
        }
        const data = await response.json().then(res => res.data); // Access the 'data' property

        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';

            if (data.users && Array.isArray(data.users)) {
                if (data.users.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="loading-text">No users found.</td></tr>';
                } else {
                    data.users.forEach(user => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${user._id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td><span class="role-badge ${user.role}">${user.role}</span></td>
                            <td><span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                            <td>
                                <button class="btn-sm btn-edit" data-id="${user._id}">Edit</button>
                                <button class="btn-sm btn-delete" data-id="${user._id}">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }

                const paginationContainer = document.getElementById('pagination-container');
                if (paginationContainer && data.totalPages && data.currentPage) {
                    paginationContainer.innerHTML = '';
                    for (let i = 1; i <= data.totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        pageBtn.className = `btn-pagination ${i === data.currentPage ? 'active' : ''}`;
                        pageBtn.addEventListener('click', () => loadUsers(i));
                        paginationContainer.appendChild(pageBtn);
                    }
                }
            } else {
                tableBody.innerHTML = '<tr><td colspan="6" class="loading-text" style="color: red;">Error: Users data is missing or invalid.</td></tr>';
                console.warn('Users data is missing or not an array.');
            }
        } else {
            console.warn('Users table body element not found.');
        }

    } catch (error) {
        console.error('Error loading users:', error);
        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: red;">Error loading users: ${error.message}</td></tr>`;
        }
    }
}

export function editUser(id) { console.log('Edit user:', id); }
export function deleteUser(id) { console.log('Delete user:', id); }

// loadReports function updated to remove Chart.js specific code
export function loadReports() {
    console.log('Loading reports data for ML integration...');
    // This is where you would integrate with your ML bot's output
    // For now, it will just display a message or fetch data for the bot.

    const complaintsReportDiv = document.getElementById('ml-complaints-report');
    if (complaintsReportDiv) {
        complaintsReportDiv.innerHTML = '<p>ML Bot will generate complaint status report here.</p>';
        // Example: Fetch data for ML bot
        // fetch('/api/ml-reports/complaints-status')
        //     .then(res => res.json())
        //     .then(data => {
        //         // Process data and display it or send to ML bot for visualization
        //         complaintsReportDiv.innerHTML = `<p>ML Bot processed data: ${JSON.stringify(data)}</p>`;
        //     })
        //     .catch(error => {
        //         console.error('Error fetching ML complaints report:', error);
        //         complaintsReportDiv.innerHTML = '<p style="color: red;">Failed to load ML complaints report.</p>';
        //     });
    } else {
        console.warn('ML complaints report container not found.');
    }

    const usersReportDiv = document.getElementById('ml-users-report');
    if (usersReportDiv) {
        usersReportDiv.innerHTML = '<p>ML Bot will generate user role distribution report here.</p>';
        // Example: Fetch data for ML bot
        // fetch('/api/ml-reports/user-roles')
        //     .then(res => res.json())
        //     .then(data => {
        //         // Process data and display it or send to ML bot for visualization
        //         usersReportDiv.innerHTML = `<p>ML Bot processed data: ${JSON.stringify(data)}</p>`;
        //     })
        //     .catch(error => {
        //         console.error('Error fetching ML users report:', error);
        //         usersReportDiv.innerHTML = '<p style="color: red;">Failed to load ML users report.</p>';
        //     });
    } else {
        console.warn('ML users report container not found.');
    }
}

// Complaints Management Functions
export async function loadComplaints(page = 1, statusFilter = 'all', priorityFilter = 'all') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = '/admin/login.html';
            return;
        }

        let url = `/api/admin/complaints?page=${page}`;
        if (statusFilter !== 'all') {
            url += `&status=${statusFilter}`;
        }
        if (priorityFilter !== 'all') {
            url += `&priority=${priorityFilter}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to load complaints: ${response.status}`);
        }

        const data = await response.json().then(res => res.data); // Access the 'data' property
        const tableBody = document.getElementById('complaints-table-body');

        if (tableBody) {
            tableBody.innerHTML = '';

            if (data.complaints && Array.isArray(data.complaints)) {
                if (data.complaints.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No complaints found.</td></tr>';
                } else {
                    data.complaints.forEach(complaint => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${complaint._id}</td>
                            <td>${complaint.title}</td>
                            <td>${complaint.submittedBy ? complaint.submittedBy.username : 'N/A'}</td>
                            <td>${new Date(complaint.createdAt).toLocaleDateString()}</td>
                            <td><span class="status-badge ${complaint.status}">${complaint.status}</span></td>
                            <td><span class="status-badge ${complaint.priority}">${complaint.priority}</span></td>
                            <td>
                                <button class="btn-sm btn-edit" data-id="${complaint._id}">View</button>
                                <button class="btn-sm btn-delete" data-id="${complaint._id}">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            } else {
                tableBody.innerHTML = '<tr><td colspan="7">Error: Complaints data is missing or invalid.</td></tr>';
                console.warn('Complaints data is missing or not an array.');
            }
        } else {
            console.warn('Complaints table body element not found.');
        }

    } catch (error) {
        console.error('Error loading complaints:', error);
        const tableBody = document.getElementById('complaints-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="color: red;">Error loading complaints: ${error.message}</td></tr>`;
        }
    }
}
