document.addEventListener('DOMContentLoaded', async () => {
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

  // Add loading state
  [totalUsers, activeComplaints, resolvedCases, avgResolutionTime, recentActivity, statusChartCanvas, trendsChartCanvas, departmentChartCanvas].forEach(el => {
    el.parentElement.classList.add('loading');
  });

  // Sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
  });

  try {
    // Fetch dashboard stats
    const stats = await apiRequest('/users/dashboard-stats', 'GET');
    totalUsers.textContent = stats.data.totalUsers || 0;
    activeComplaints.textContent = stats.data.activeComplaints || 0;
    resolvedCases.textContent = stats.data.resolvedCases || 0;
    avgResolutionTime.textContent = `${stats.data.avgResolutionTime || 0} hrs`;

    // Fetch recent activity
    const activities = await apiRequest('/admin/recent-activity', 'GET');
    recentActivity.innerHTML = activities.data.map(activity => `
      <li>${activity.user} ${activity.action} at ${new Date(activity.timestamp).toLocaleString()}</li>
    `).join('');

    // Fetch charts
    const statusData = await apiRequest('/ml/complaint_status_distribution');
    new Chart(statusChartCanvas, {
      ...statusData.data,
      options: { ...statusData.data.options, responsive: true, plugins: { legend: { position: 'top' } } }
    });

    const trendsData = await apiRequest('/ml/complaint_trends');
    new Chart(trendsChartCanvas, {
      ...trendsData.data,
      options: { ...trendsData.data.options, responsive: true, plugins: { legend: { position: 'top' } } }
    });

    const deptData = await apiRequest('/ml/complaint_department_distribution');
    new Chart(departmentChartCanvas, {
      ...deptData.data,
      options: { ...deptData.data.options, responsive: true, plugins: { legend: { position: 'top' } } }
    });

    // Remove loading state
    [totalUsers, activeComplaints, resolvedCases, avgResolutionTime, recentActivity, statusChartCanvas, trendsChartCanvas, departmentChartCanvas].forEach(el => {
      el.parentElement.classList.remove('loading');
    });
  } catch (error) {
    displayError(error.message);
  }
});