let currentPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  const statusFilter = document.getElementById('status-filter');
  const priorityFilter = document.getElementById('priority-filter');
  const complaintsTable = document.getElementById('complaints-table');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const currentPageSpan = document.getElementById('current-page');
  const totalPagesSpan = document.getElementById('total-pages');

  async function loadComplaints(page = 1, status = 'all', priority = 'all') {
    try {
      const query = `?page=${page}&status=${status}&priority=${priority}`;
      const data = await apiRequest(`/admin/complaints${query}`, 'GET', null, token);
      complaintsTable.innerHTML = '';
      data.data.complaints.forEach(complaint => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${complaint.title}</td>
          <td>${complaint.category}</td>
          <td>${complaint.status}</td>
          <td>${complaint.priority || 'N/A'}</td>
          <td>
            <select onchange="updateComplaint('${complaint._id}', this)">
              <option value="" disabled selected>Update Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select onchange="updateComplaint('${complaint._id}', this, true)">
              <option value="" disabled selected>Update Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <button onclick="predictResolutionTime('${complaint._id}', '${complaint.description}')">Predict</button>
          </td>
        `;
        complaintsTable.appendChild(tr);
      });

      currentPage = data.data.currentPage;
      currentPageSpan.textContent = currentPage;
      totalPagesSpan.textContent = data.data.totalPages;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === data.data.totalPages;
    } catch (error) {
      displayError(error.message);
    }
  }

  async function updateComplaint(complaintId, select, isPriority = false) {
    const field = isPriority ? 'priority' : 'status';
    const value = select.value;
    if (!value) return;

    try {
      await apiRequest(`/admin/complaints/${complaintId}/status`, 'PUT', { [field]: value }, token);
      loadComplaints(currentPage, statusFilter.value, priorityFilter.value);
    } catch (error) {
      displayError(error.message);
    }
  }

  async function predictResolutionTime(complaintId, description) {
    try {
      const data = await apiRequest('/admin/predict/resolution_time', 'POST', {
        complaint_description_length: description.split(' ').length,
        num_evidence_files: 0, // Adjust based on your backend implementation
      }, token);
      alert(`Predicted Resolution Time: ${data.predicted_resolution_time_days} days`);
    } catch (error) {
      displayError(error.message);
    }
  }

  statusFilter.addEventListener('change', () => loadComplaints(1, statusFilter.value, priorityFilter.value));
  priorityFilter.addEventListener('change', () => loadComplaints(1, statusFilter.value, priorityFilter.value));
  prevPage.addEventListener('click', () => loadComplaints(currentPage - 1, statusFilter.value, priorityFilter.value));
  nextPage.addEventListener('click', () => loadComplaints(currentPage + 1, statusFilter.value, priorityFilter.value));
  loadComplaints();
});