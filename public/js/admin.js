const API_URL = 'http://localhost:5000/api';

async function fetchAllComplaintsForAdmin() {
    const adminComplaintsList = document.getElementById('adminComplaintsList');
    const noAdminComplaintsMessage = document.getElementById('noAdminComplaintsMessage');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo || !userInfo.token) {
        if (noAdminComplaintsMessage) noAdminComplaintsMessage.textContent = 'Please log in as an admin to view this page.';
        if (adminComplaintsList) adminComplaintsList.innerHTML = '';
        window.location.href = 'login.html'; // Path relative to current admin folder
        return;
    }

    // IMPORTANT: Ensure the user's role is 'admin'
    if (userInfo.role !== 'admin') {
        if (noAdminComplaintsMessage) noAdminComplaintsMessage.textContent = 'You do not have administrative access to view this page.';
        if (adminComplaintsList) adminComplaintsList.innerHTML = '';
        return;
    }

    // --- Fetch complaint statistics ---
    try {
        const statsRes = await fetch(`${API_URL}/complaints/statistics`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });

        if (!statsRes.ok) {
            // If response is not OK, log error and potentially alert user
            const errorData = await statsRes.json();
            console.error('Failed to fetch complaint statistics:', errorData.message);
            alert('Failed to load complaint statistics: ' + (errorData.message || 'Unknown error'));
            // If it's an auth error, redirect to login
            if (statsRes.status === 401 || statsRes.status === 403) {
                localStorage.removeItem('userInfo');
                window.location.href = 'login.html';
            }
            return; // Stop execution if stats fetch fails
        }

        const statsData = await statsRes.json();
        console.log("Fetched statistics:", statsData); // Debugging: Check what data is received

        // Update the DOM elements with fetched statistics
        document.getElementById('totalComplaintsCount').textContent = statsData.total;
        document.getElementById('pendingComplaintsCount').textContent = statsData.pending;
        document.getElementById('inProgressComplaintsCount').textContent = statsData.inProgress;
        document.getElementById('resolvedComplaintsCount').textContent = statsData.resolved;
        document.getElementById('rejectedComplaintsCount').textContent = statsData.rejected;

    } catch (error) {
        console.error('Error fetching complaint statistics:', error);
        alert('An error occurred while fetching complaint statistics. Please try again.');
        // Consider redirecting to login if it's a network error or token issue
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
        return; // Stop execution
    }


    // --- Fetch all complaints list (existing logic) ---
    try {
        const res = await fetch(`${API_URL}/complaints/all`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });

        const complaints = await res.json();

        if (res.ok) {
            if (complaints.length === 0) {
                if (noAdminComplaintsMessage) noAdminComplaintsMessage.classList.remove('hidden');
                if (adminComplaintsList) adminComplaintsList.innerHTML = '';
            } else {
                if (noAdminComplaintsMessage) noAdminComplaintsMessage.classList.add('hidden');
                if (adminComplaintsList) {
                    adminComplaintsList.innerHTML = complaints.map(complaint => `
                        <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 class="text-xl font-semibold text-gray-900 mb-2">${complaint.title}</h3>
                            <p class="text-gray-700 mb-3 line-clamp-3">${complaint.description}</p>
                            <p class="text-sm text-gray-600 mb-2">Submitted by: ${complaint.user ? complaint.user.fullName || complaint.user.username : 'Unknown User'}</p>
                            <p class="text-sm text-gray-600 mb-2">Status: <span id="status-${complaint._id}" class="font-bold status-${complaint.status.replace(/\s/g, '')}">${complaint.status}</span></p>
                            <p class="text-sm text-gray-500">Submitted: ${new Date(complaint.createdAt).toLocaleDateString()}</p>
                            
                            <!-- Admin Feedback Display (Read-only on card) -->
                            ${complaint.adminFeedback ? `<p class="text-sm text-gray-700 mt-2 italic">Admin Feedback: "${complaint.adminFeedback.substring(0, 50)}..."</p>` : ''}

                            <div class="mt-4 flex flex-wrap gap-2 items-end">
                                <div class="flex-grow">
                                    <label for="statusSelect-${complaint._id}" class="block text-xs font-medium text-gray-700 mb-1">Update Status</label>
                                    <select id="statusSelect-${complaint._id}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                        <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                        <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                                        <option value="Rejected" ${complaint.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                    </select>
                                </div>
                                <div class="flex-grow">
                                    <label for="adminFeedbackInput-${complaint._id}" class="block text-xs font-medium text-gray-700 mb-1">Admin Feedback</label>
                                    <textarea id="adminFeedbackInput-${complaint._id}" rows="2"
                                              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="Add feedback...">${complaint.adminFeedback || ''}</textarea>
                                </div>
                                <button data-id="${complaint._id}"
                                        class="update-complaint-btn px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md
                                               hover:bg-green-700 transition duration-300 flex-shrink-0">
                                    Update
                                </button>
                                <button data-id="${complaint._id}"
                                        class="delete-complaint-btn px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md
                                               hover:bg-red-700 transition duration-300 flex-shrink-0">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `).join('');
console.log("Complaints fetched and displayed:", complaints); // Debugging: Check what complaints are displayed
                    document.querySelectorAll('.update-complaint-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const id = e.target.dataset.id;
                            const newStatus = document.getElementById(`statusSelect-${id}`).value;
                            const newAdminFeedback = document.getElementById(`adminFeedbackInput-${id}`).value;
                            await updateComplaint(id, newStatus, newAdminFeedback);
                        });
                    });

                    document.querySelectorAll('.delete-complaint-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const id = e.target.dataset.id;
                            if (confirm('Are you sure you want to delete this complaint?')) {
                                await deleteComplaint(id);
                            }
                        });
                    });
                }
            }
        } else {
            alert(complaints.message || 'Failed to fetch complaints for admin');
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.log('Error fetching all complaints for admin:', error);
        console.error('Error fetching all complaints for admin:', error);
        alert('An error occurred while fetching complaints. Please try again.');
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
    }
}

async function updateComplaint(id, status, adminFeedback) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
        alert('You must be logged in to update complaint status.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/complaints/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userInfo.token}`,
            },
            body: JSON.stringify({ status, adminFeedback }),
        });

        const data = await res.json();

        if (res.ok) {
            alert('Complaint updated successfully!');
            fetchAllComplaintsForAdmin();
        } else {
            alert(data.message || 'Failed to update complaint');
        }
    } catch (error) {
        console.error('Error updating complaint:', error);
        alert('An error occurred during update. Please try again.');
    }
}

async function deleteComplaint(id) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
        alert('You must be logged in to delete complaints.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/complaints/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });

        const data = await res.json();

        if (res.ok) {
            alert('Complaint deleted successfully!');
            fetchAllComplaintsForAdmin();
        } else {
            alert(data.message || 'Failed to delete complaint');
        }
    } catch (error) {
        console.error('Error deleting complaint:', error);
        alert('An error occurred during complaint deletion. Please try again.');
    }
}