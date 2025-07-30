document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/citizen/login.html';
    return;
  }

  try {
    const stats = await apiRequest('/users/dashboard-stats', 'GET', null, token);
    document.getElementById('total-complaints').textContent = stats.data.totalComplaints;
    document.getElementById('pending-complaints').textContent = stats.data.pendingComplaints;
    document.getElementById('resolved-complaints').textContent = stats.data.resolvedComplaints;

    const complaintsList = document.getElementById('recent-complaints');
    stats.data.recentComplaints.forEach(complaint => {
      const li = document.createElement('li');
      li.textContent = `${complaint.title} - ${complaint.status} (${formatDate(complaint.createdAt)})`;
      complaintsList.appendChild(li);
    });
  } catch (error) {
    displayError(error.message);
  }
});