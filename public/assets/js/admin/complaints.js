// public/assets/js/admin/complaints.js

function escapeHTML(str) {
    if (typeof str === 'undefined' || str === null) {
        return '';
    }
    if (typeof str !== 'string') {
        str = String(str);
    }
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

const messageContainer = document.getElementById('message-container');
const messageContent = document.getElementById('message-content');

function displayMessage(message, type = 'success', targetElement = 'main') {
    const container = document.getElementById('message-container') || document.querySelector(targetElement);
    let contentElement = document.getElementById('message-content');

    if (!container || !contentElement) {
        if (!container) {
            const target = document.querySelector(targetElement);
            if (target) {
                const newContainer = document.createElement('div');
                newContainer.id = 'message-container';
                newContainer.classList.add('mb-4');
                newContainer.innerHTML = '<div id="message-content" class="p-3 rounded-md text-sm"></div>';
                target.prepend(newContainer);
                container = newContainer;
                contentElement = document.getElementById('message-content');
            } else {
                alert(`${type.toUpperCase()}: ${message}`);
                return;
            }
        } else {
            const newContent = document.createElement('div');
            newContent.id = 'message-content';
            newContent.classList.add('p-3', 'rounded-md', 'text-sm');
            container.appendChild(newContent);
            contentElement = newContent;
        }
    }

    contentElement.textContent = message;
    container.classList.remove('hidden');

    contentElement.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800');
    if (type === 'success') {
        contentElement.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        contentElement.classList.add('bg-red-100', 'text-red-800');
    } else {
        contentElement.classList.add('bg-blue-100', 'text-blue-800');
    }

    if (type !== 'error') {
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }
}

const complaintModal = document.getElementById('complaint-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalContent = document.getElementById('modal-content');

const adminUsernameSpan = document.getElementById('admin-username');

const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
    });
}

let currentPage = 1;
let currentStatusFilter = 'all';
let currentPriorityFilter = 'all';
let currentSearchQuery = '';
const DEFAULT_PAGE_SIZE = 10;

const complaintsTableBody = document.getElementById('complaints-table-body');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const startItemSpan = document.getElementById('start-item');
const endItemSpan = document.getElementById('end-item');
const totalItemsSpan = document.getElementById('total-items');

const statusFilter = document.getElementById('status-filter');
const priorityFilter = document.getElementById('priority-filter');
const searchInput = document.getElementById('search-complaints');
const refreshComplaintsBtn = document.getElementById('refresh-complaints');
const exportComplaintsBtn = document.getElementById('export-complaints');

async function loadComplaints(page = 1, status = 'all', priority = 'all', search = '') {
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    complaintsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">Loading complaints...</td></tr>';

    try {
        const query = `?page=${page}&limit=${DEFAULT_PAGE_SIZE}&status=${status}&priority=${priority}&search=${encodeURIComponent(search)}`;
        const response = await adminApiRequest(`/complaints${query}`, 'GET');

        if (response.success && response.data) {
            const { complaints, currentPage: resCurrentPage, totalPages: resTotalPages, totalCount } = response.data;

            complaintsTableBody.innerHTML = '';

            if (complaints.length === 0) {
                complaintsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No complaints found.</td></tr>';
            } else {
                complaints.forEach(complaint => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50';

                    const complaintDate = new Date(complaint.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    const assignedTo = complaint.assignedTo ? escapeHTML(complaint.assignedTo.username) : 'Unassigned';

                    tr.innerHTML = `
                        <td class="p-3">${escapeHTML(complaint._id.slice(-6))}</td>
                        <td class="p-3">${escapeHTML(complaint.title)}</td>
                        <td class="p-3">${escapeHTML(complaint.category)}</td>
                        <td class="p-3">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full
                                ${complaint.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : ''}
                                ${complaint.status === 'In Progress' ? 'bg-blue-200 text-blue-800' : ''}
                                ${complaint.status === 'Resolved' ? 'bg-green-200 text-green-800' : ''}
                                ${complaint.status === 'Rejected' ? 'bg-red-200 text-red-800' : ''}">
                                ${escapeHTML(complaint.status)}
                            </span>
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full
                                ${complaint.priority === 'Low' ? 'bg-gray-200 text-gray-800' : ''}
                                ${complaint.priority === 'Medium' ? 'bg-yellow-200 text-yellow-800' : ''}
                                ${complaint.priority === 'High' ? 'bg-orange-200 text-orange-800' : ''}
                                ${complaint.priority === 'Critical' ? 'bg-red-200 text-red-800' : ''}">
                                ${escapeHTML(complaint.priority || 'N/A')}
                            </span>
                        </td>
                        <td class="p-3 text-sm text-gray-600">${complaintDate}</td>
                        <td class="p-3">${assignedTo}</td>
                        <td class="p-3">
                            <button class="text-blue-600 hover:text-blue-800 mr-2" onclick="viewComplaintDetails('${complaint._id}')" aria-label="View Complaint Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-purple-600 hover:text-purple-800 mr-2" onclick="viewComplaintDetails('${complaint._id}')" aria-label="Edit Complaint">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-800" onclick="deleteComplaint('${complaint._id}')" aria-label="Delete Complaint">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    `;
                    complaintsTableBody.appendChild(tr);
                });
            }

            currentPage = resCurrentPage;
            totalPages = resTotalPages;

            currentPageSpan.textContent = currentPage;
            totalPagesSpan.textContent = totalPages;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;

            const limit = DEFAULT_PAGE_SIZE;
            startItemSpan.textContent = totalCount > 0 ? ((currentPage - 1) * limit + 1) : 0;
            endItemSpan.textContent = Math.min(currentPage * limit, totalCount);
            totalItemsSpan.textContent = totalCount;

        } else {
            displayMessage(response.message || 'Failed to load complaints.', 'error');
            complaintsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-500">${escapeHTML(response.message || 'Failed to load complaints.')}</td></tr>`;
        }
    } catch (error) {
        displayMessage(`Error loading complaints: ${error.message || 'Unknown error'}`, 'error');
        complaintsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-500">Error loading complaints: ${escapeHTML(error.message || 'Unknown error')}</td></tr>`;
    }
}

window.viewComplaintDetails = async function(complaintId) {
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    modalContent.innerHTML = '<p class="text-center py-4">Loading details...</p>';
    complaintModal.classList.remove('hidden');

    try {
        const response = await adminApiRequest(`/complaints/${complaintId}`, 'GET');
        if (response.success && response.data) {
            const complaint = response.data;
            const userEmail = complaint.user ? escapeHTML(complaint.user.email) : 'Anonymous';
            const userName = complaint.user ? escapeHTML(complaint.user.username) : 'Anonymous';
            const assignedToName = complaint.assignedTo ? escapeHTML(complaint.assignedTo.username) : 'Unassigned';
            const assignedToId = complaint.assignedTo ? complaint.assignedTo._id : '';

            const locationText = complaint.location && complaint.location.text ? escapeHTML(complaint.location.text) : 'N/A';
            const coordinates = complaint.location && complaint.location.coordinates ?
                                `Lat: ${complaint.location.coordinates[1]}, Lon: ${complaint.location.coordinates[0]}` : 'N/A';
            const createdAt = new Date(complaint.createdAt).toLocaleString();
            const updatedAt = new Date(complaint.updatedAt).toLocaleString();
            const resolvedAt = complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString() : 'N/A';

            let responseHistoryHtml = '';
            if (complaint.responseHistory && complaint.responseHistory.length > 0) {
                responseHistoryHtml = complaint.responseHistory.map(response => `
                    <div class="mb-2 p-3 bg-gray-100 rounded-md">
                        <p class="text-sm font-semibold">Response by ${escapeHTML(response.responder)} on ${new Date(response.timestamp).toLocaleString()}:</p>
                        <p class="text-gray-700">${escapeHTML(response.text)}</p>
                    </div>
                `).join('');
            } else {
                responseHistoryHtml = '<p class="text-gray-600">No response history.</p>';
            }

            const evidenceHtml = [];
            if (complaint.evidenceImages && complaint.evidenceImages.length > 0) {
                evidenceHtml.push('<p class="font-semibold mt-4">Evidence Images:</p>');
                complaint.evidenceImages.forEach(img => {
                    const imgPath = img.startsWith('uploads/') ? `/${img}` : img;
                    evidenceHtml.push(`<img src="${escapeHTML(imgPath)}" alt="Evidence Image" class="max-w-xs h-auto mb-2 rounded shadow-md">`);
                });
            }
            if (complaint.evidenceVideos && complaint.evidenceVideos.length > 0) {
                evidenceHtml.push('<p class="font-semibold mt-4">Evidence Videos:</p>');
                complaint.evidenceVideos.forEach(vid => {
                    const vidPath = vid.startsWith('uploads/') ? `/${vid}` : vid;
                    evidenceHtml.push(`<video controls src="${escapeHTML(vidPath)}" class="max-w-xs h-auto mb-2 rounded shadow-md"></video>`);
                });
            }
            if (complaint.evidencePdfs && complaint.evidencePdfs.length > 0) {
                evidenceHtml.push('<p class="font-semibold mt-4">Evidence PDFs:</p>');
                complaint.evidencePdfs.forEach(pdf => {
                    const pdfPath = pdf.startsWith('uploads/') ? `/${pdf}` : pdf;
                    evidenceHtml.push(`<a href="${escapeHTML(pdfPath)}" target="_blank" class="text-blue-600 hover:underline flex items-center mb-2"><i class="fas fa-file-pdf mr-1"></i> View PDF</a>`);
                });
            }
            if (evidenceHtml.length === 0) {
                evidenceHtml.push('<p class="text-gray-600">No evidence provided.</p>');
            }

            modalContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p><strong class="font-semibold">ID:</strong> ${escapeHTML(complaint._id)}</p>
                        <p><strong class="font-semibold">Title:</strong> ${escapeHTML(complaint.title)}</p>
                        <p><strong class="font-semibold">Category:</strong> ${escapeHTML(complaint.category)}</p>
                        <p><strong class="font-semibold">Description:</strong> ${escapeHTML(complaint.description)}</p>
                        <p><strong class="font-semibold">Status:</strong>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full
                                ${complaint.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : ''}
                                ${complaint.status === 'In Progress' ? 'bg-blue-200 text-blue-800' : ''}
                                ${complaint.status === 'Resolved' ? 'bg-green-200 text-green-800' : ''}
                                ${complaint.status === 'Rejected' ? 'bg-red-200 text-red-800' : ''}">
                                ${escapeHTML(complaint.status)}
                            </span>
                        </p>
                        <p><strong class="font-semibold">Priority:</strong>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full
                                ${complaint.priority === 'Low' ? 'bg-gray-200 text-gray-800' : ''}
                                ${complaint.priority === 'Medium' ? 'bg-yellow-200 text-yellow-800' : ''}
                                ${complaint.priority === 'High' ? 'bg-orange-200 text-orange-800' : ''}
                                ${complaint.priority === 'Critical' ? 'bg-red-200 text-red-800' : ''}">
                                ${escapeHTML(complaint.priority || 'N/A')}
                            </span>
                        </p>
                        <p><strong class="font-semibold">Location Text:</strong> ${locationText}</p>
                        <p><strong class="font-semibold">GPS Coordinates:</strong> ${coordinates}</p>
                        <p><strong class="font-semibold">Submitted By:</strong> ${userName} (${userEmail})</p>
                        <p><strong class="font-semibold">Assigned To:</strong> ${assignedToName}</p>
                        <p><strong class="font-semibold">Submitted On:</strong> ${createdAt}</p>
                        <p><strong class="font-semibold">Last Updated:</strong> ${updatedAt}</p>
                        <p><strong class="font-semibold">Resolved On:</strong> ${resolvedAt}</p>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold mb-2">Evidence:</h4>
                        ${evidenceHtml.join('')}

                        <h4 class="text-lg font-semibold mt-4 mb-2">Response History:</h4>
                        ${responseHistoryHtml}

                        <h4 class="text-lg font-semibold mt-4 mb-2">Action:</h4>
                        <div class="flex flex-col space-y-2">
                            <label for="modal-status-select" class="block text-sm font-medium text-gray-700">Update Status:</label>
                            <select id="modal-status-select" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="">Select Status</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                            <label for="modal-priority-select" class="block text-sm font-medium text-gray-700">Update Priority:</label>
                            <select id="modal-priority-select" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="">Select Priority</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                            <label for="modal-assign-staff-select" class="block text-sm font-medium text-gray-700">Assign To Staff:</label>
                            <select id="modal-assign-staff-select" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="">Select Staff (Unassign)</option>
                            </select>
                            <label for="modal-response-text" class="block text-sm font-medium text-gray-700">Add Response (Optional):</label>
                            <textarea id="modal-response-text" rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>

                            <button id="modal-update-btn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Update Complaint</button>
                            <button id="modal-predict-btn" class="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Predict Resolution Time</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modal-status-select').value = complaint.status || '';
            document.getElementById('modal-priority-select').value = complaint.priority || '';

            const assignStaffSelect = document.getElementById('modal-assign-staff-select');
            assignStaffSelect.innerHTML = '<option value="">Select Staff (Unassign)</option>';
            try {
                const staffResponse = await adminApiRequest('/users/staff', 'GET');
                if (staffResponse.success && staffResponse.data) {
                    staffResponse.data.forEach(staff => {
                        const option = document.createElement('option');
                        option.value = staff._id;
                        option.textContent = escapeHTML(staff.username);
                        assignStaffSelect.appendChild(option);
                    });
                    if (assignedToId) {
                        assignStaffSelect.value = assignedToId;
                    }
                }
            } catch (staffError) {
                displayMessage("Could not load staff for assignment dropdown.", 'error', '#modal-content');
            }


            document.getElementById('modal-update-btn').addEventListener('click', async () => {
                const newStatus = document.getElementById('modal-status-select').value;
                const newPriority = document.getElementById('modal-priority-select').value;
                const newAssignedTo = document.getElementById('modal-assign-staff-select').value || null;
                const responseText = document.getElementById('modal-response-text').value.trim();

                const updatePayload = {};
                if (newStatus && newStatus !== complaint.status) updatePayload.status = newStatus;
                if (newPriority && newPriority !== complaint.priority) updatePayload.priority = newPriority;
                if (newAssignedTo !== assignedToId) {
                     updatePayload.assignedTo = newAssignedTo;
                }
                if (responseText) updatePayload.responseText = responseText;

                if (Object.keys(updatePayload).length > 0) {
                    try {
                        const updateResponse = await adminApiRequest(`/complaints/${complaintId}`, 'PUT', updatePayload);
                        if (updateResponse.success) {
                            displayMessage('Complaint updated successfully!', 'success', '#modal-content');
                            loadComplaints(currentPage, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
                            setTimeout(() => {
                                complaintModal.classList.add('hidden');
                            }, 1500);
                        } else {
                            displayMessage(`Failed to update complaint: ${updateResponse.message}`, 'error', '#modal-content');
                        }
                    } catch (updateError) {
                        displayMessage(`Error updating complaint: ${updateError.message}`, 'error', '#modal-content');
                    }
                } else {
                    displayMessage('No changes detected for update.', 'info', '#modal-content');
                }
            });

            document.getElementById('modal-predict-btn').addEventListener('click', async () => {
                const descriptionLength = complaint.description ? complaint.description.split(' ').length : 0;
                const numEvidenceFiles = (complaint.evidenceImages ? complaint.evidenceImages.length : 0) +
                                         (complaint.evidenceVideos ? complaint.evidenceVideos.length : 0) +
                                         (complaint.evidencePdfs ? complaint.evidencePdfs.length : 0);
                try {
                    const predictionResponse = await mlApiRequest('/predict/resolution_time', 'POST', {
                        complaint_description_length: descriptionLength,
                        num_evidence_files: numEvidenceFiles,
                    });
                    if (predictionResponse.success && predictionResponse.predicted_resolution_time_days) {
                        displayMessage(`Predicted Resolution Time: ${predictionResponse.predicted_resolution_time_days.toFixed(2)} days`, 'info', '#modal-content');
                    } else {
                        displayMessage(predictionResponse.message || 'Prediction not available.', 'error', '#modal-content');
                    }
                } catch (predictError) {
                    displayMessage(`Failed to get prediction: ${predictError.message}`, 'error', '#modal-content');
                }
            });

        } else {
            modalContent.innerHTML = `<p class="text-red-500">Failed to load details: ${escapeHTML(response.message || 'Unknown error')}</p>`;
        }
    } catch (error) {
        modalContent.innerHTML = `<p class="text-red-500">Error: ${escapeHTML(error.message || 'Unknown error')}</p>`;
    }
}

window.deleteComplaint = async function(complaintId) {
    if (!confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
        return;
    }
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    try {
        const response = await adminApiRequest(`/complaints/${complaintId}`, 'DELETE');
        if (response.success) {
            displayMessage('Complaint deleted successfully!', 'success');
            loadComplaints(currentPage, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
        } else {
            displayMessage(`Failed to delete complaint: ${response.message}`, 'error');
        }
    } catch (error) {
        displayMessage(`Error deleting complaint: ${error.message}`, 'error');
    }
};

statusFilter.addEventListener('change', () => {
    currentStatusFilter = statusFilter.value;
    loadComplaints(1, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
});

priorityFilter.addEventListener('change', () => {
    currentPriorityFilter = priorityFilter.value;
    loadComplaints(1, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
});

searchInput.addEventListener('input', debounce(() => {
    currentSearchQuery = searchInput.value;
    loadComplaints(1, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
}, 300));

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        loadComplaints(currentPage - 1, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < parseInt(totalPagesSpan.textContent)) {
        loadComplaints(currentPage + 1, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
    }
});

refreshComplaintsBtn.addEventListener('click', () => {
    loadComplaints(currentPage, currentStatusFilter, currentPriorityFilter, currentSearchQuery);
});

exportComplaintsBtn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    try {
        displayMessage('Exporting complaints...', 'info');
        const response = await fetch(`/api/admin/complaints/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'complaints.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            displayMessage('Complaints exported successfully!', 'success');
        } else {
            const errorData = await response.json();
            displayMessage(errorData.message || 'Failed to export complaints.', 'error');
        }
    } catch (error) {
        displayMessage(`Error during export: ${error.message}`, 'error');
    }
});

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        complaintModal.classList.add('hidden');
        modalContent.innerHTML = '';
    });
}
window.addEventListener('click', (event) => {
    if (event.target === complaintModal) {
        complaintModal.classList.add('hidden');
        modalContent.innerHTML = '';
    }
});

window.generateInviteCode = async function() {
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    try {
        const response = await adminApiRequest('/generate-invite', 'POST');
        if (response.success && response.data && response.data.code) {
            prompt("New invite code generated:", response.data.code);
            displayMessage('New invite code generated successfully!', 'success');
        } else {
            displayMessage(response.message || 'Failed to generate invite code.', 'error');
        }
    } catch (error) {
        displayMessage(`Error generating invite code: ${error.message}`, 'error');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    try {
        const authCheckResponse = await adminApiRequest('/auth/check', 'GET');
        if (authCheckResponse.success && authCheckResponse.data) {
            adminUsernameSpan.textContent = authCheckResponse.data.username;
            loadComplaints();
        } else {
            removeToken();
            window.location.href = '/admin/login.html';
        }
    } catch (error) {
        removeToken();
        window.location.href = '/admin/login.html';
    }
});