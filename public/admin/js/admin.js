// public/admin/js/admin.js

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
                    // Previous button
                    const prevBtn = document.createElement('button');
                    prevBtn.textContent = 'Previous';
                    prevBtn.className = 'btn-pagination';
                    prevBtn.disabled = data.currentPage === 1;
                    prevBtn.addEventListener('click', () => loadUsers(data.currentPage - 1));
                    paginationContainer.appendChild(prevBtn);

                    // Page info
                    const pageInfo = document.createElement('span');
                    pageInfo.className = 'page-info';
                    pageInfo.textContent = `Page ${data.currentPage} of ${data.totalPages}`;
                    paginationContainer.appendChild(pageInfo);

                    // Next button
                    const nextBtn = document.createElement('button');
                    nextBtn.textContent = 'Next';
                    nextBtn.className = 'btn-pagination';
                    nextBtn.disabled = data.currentPage === data.totalPages;
                    nextBtn.addEventListener('click', () => loadUsers(data.currentPage + 1));
                    paginationContainer.appendChild(nextBtn);
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

// loadReports function updated to fetch and display ML-generated charts
export async function loadReports() {
    console.log('Loading ML-generated reports and predictions...');
    const mlBackendUrl = 'http://localhost:5001'; // Your Python Flask ML backend URL

    // Function to fetch and display an image chart
    async function fetchChart(endpoint, imgId, containerId) {
        const imgElement = document.getElementById(imgId);
        const containerElement = document.getElementById(containerId);
        if (!imgElement || !containerElement) {
            console.warn(`Chart elements not found for ${imgId} or ${containerId}`);
            return;
        }
        containerElement.querySelector('.loading-text').style.display = 'block';
        imgElement.style.display = 'none';
        imgElement.src = ''; // Clear previous image

        try {
            const response = await fetch(`${mlBackendUrl}${endpoint}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch chart from ${endpoint}: ${response.status}`);
            }
            const data = await response.json();
            if (data.image) {
                imgElement.src = `data:image/png;base64,${data.image}`;
                imgElement.style.display = 'block';
                containerElement.querySelector('.loading-text').style.display = 'none';
            } else {
                imgElement.style.display = 'none';
                containerElement.querySelector('.loading-text').textContent = data.message || 'No chart generated.';
            }
        } catch (error) {
            console.error(`Error fetching chart from ${endpoint}:`, error);
            imgElement.style.display = 'none';
            containerElement.querySelector('.loading-text').textContent = `Error loading chart: ${error.message}`;
            containerElement.querySelector('.loading-text').style.color = 'red';
        }
    }

    // Fetch and display charts
    fetchChart('/api/ml/complaint_status_distribution', 'complaint-status-chart', 'complaint-status-chart-container');
    fetchChart('/api/ml/complaint_trends', 'complaint-trends-chart', 'complaint-trends-chart-container');
    fetchChart('/api/ml/user_role_distribution', 'user-role-chart', 'user-role-chart-container');

    // Prediction functionality
    const predictBtn = document.getElementById('predict-btn');
    const descLengthInput = document.getElementById('desc_length');
    const numEvidenceInput = document.getElementById('num_evidence');
    const predictionResultP = document.getElementById('prediction-result');

    if (predictBtn && descLengthInput && numEvidenceInput && predictionResultP) {
        predictBtn.addEventListener('click', async () => {
            const descLength = parseInt(descLengthInput.value);
            const numEvidence = parseInt(numEvidenceInput.value);

            if (isNaN(descLength) || isNaN(numEvidence) || descLength < 0 || numEvidence < 0) {
                predictionResultP.textContent = 'Please enter valid positive numbers.';
                predictionResultP.style.color = 'red';
                return;
            }

            predictionResultP.textContent = 'Predicting...';
            predictionResultP.style.color = 'gray';

            try {
                const response = await fetch(`${mlBackendUrl}/api/ml/predict/resolution_time`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        complaint_description_length: descLength,
                        num_evidence_files: numEvidence
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    predictionResultP.textContent = `Predicted Resolution Time: ${data.predicted_resolution_time_days} days.`;
                    predictionResultP.style.color = 'green';
                    console.log('Prediction explanation:', data.explanation);
                } else {
                    predictionResultP.textContent = data.message || 'Prediction failed.';
                    predictionResultP.style.color = 'red';
                }
            } catch (error) {
                console.error('Error during prediction:', error);
                predictionResultP.textContent = `Error: ${error.message}`;
                predictionResultP.style.color = 'red';
            }
        });
    } else {
        console.warn('Prediction elements not found.');
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
        // Note: priorityFilter is included in the URL, but your Complaint model
        // does not currently have a 'priority' field. If you want to filter
        // by priority, you will need to add it to your Complaint model schema.
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
                    tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">No complaints found.</td></tr>';
                } else {
                    data.complaints.forEach(complaint => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${complaint._id}</td>
                            <td>${complaint.title}</td>
                            <td>${complaint.user ? complaint.user.username : 'Anonymous'}</td> <!-- Use complaint.user.username -->
                            <td>${new Date(complaint.createdAt).toLocaleDateString()}</td>
                            <td><span class="status-badge ${complaint.status}">${complaint.status}</span></td>
                            <td><span class="status-badge ${complaint.priority || 'N/A'}">${complaint.priority || 'N/A'}</span></td> <!-- Display priority or N/A -->
                            <td>
                                <button class="btn-sm btn-edit" data-id="${complaint._id}">View</button>
                                <button class="btn-sm btn-delete" data-id="${complaint._id}">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            } else {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Error: Complaints data is missing or invalid.</td></tr>';
                console.warn('Complaints data is missing or not an array.');
            }
        } else {
            console.warn('Complaints table body element not found.');
        }

        // Pagination logic for complaints table
        const paginationContainer = document.getElementById('complaints-pagination-container');
        if (paginationContainer && data.totalPages && data.currentPage) {
            paginationContainer.innerHTML = '';
            // Previous button
            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Previous';
            prevBtn.className = 'btn-pagination';
            prevBtn.disabled = data.currentPage === 1;
            prevBtn.addEventListener('click', () => loadComplaints(data.currentPage - 1, statusFilter, priorityFilter));
            paginationContainer.appendChild(prevBtn);

            // Page info
            const pageInfo = document.createElement('span');
            pageInfo.className = 'page-info';
            pageInfo.textContent = `Page ${data.currentPage} of ${data.totalPages}`;
            paginationContainer.appendChild(pageInfo);

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next';
            nextBtn.className = 'btn-pagination';
            nextBtn.disabled = data.currentPage === data.totalPages;
            nextBtn.addEventListener('click', () => loadComplaints(data.currentPage + 1, statusFilter, priorityFilter));
            paginationContainer.appendChild(nextBtn);
        }

    } catch (error) {
        console.error('Error loading complaints:', error);
        const tableBody = document.getElementById('complaints-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-text" style="color: red;">Error loading complaints: ${error.message}</td></tr>`;
        }
    }
}
