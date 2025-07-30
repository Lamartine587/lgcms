document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  let startDate = '';
  let endDate = '';

  async function loadCharts() {
    try {
      const query = startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : '';

      // Complaint Status Distribution
      const statusData = await mlApiRequest(`/complaint_status_distribution${query}`);
      if (statusData.data) {
        new Chart(document.getElementById('status-chart'), statusData.data);
      } else {
        displayError(statusData.message, '#status-chart');
      }

      // Complaint Trends
      const trendsData = await mlApiRequest(`/complaint_trends${query}`);
      if (trendsData.data) {
        new Chart(document.getElementById('trends-chart'), trendsData.data);
      } else {
        displayError(trendsData.message, '#trends-chart');
      }

      // User Role Distribution
      const roleData = await mlApiRequest(`/user_role_distribution${query}`);
      if (roleData.data) {
        new Chart(document.getElementById('role-chart'), roleData.data);
      } else {
        displayError(roleData.message, '#role-chart');
      }

      // Resolution Time Distribution
      const resolutionData = await mlApiRequest(`/resolution_time_distribution${query}`);
      if (resolutionData.data) {
        new Chart(document.getElementById('resolution-time-chart'), resolutionData.data);
      } else {
        displayError(resolutionData.message, '#resolution-time-chart');
      }
    } catch (error) {
      displayError(error.message);
    }
  }

  // Handle date filter form submission
  document.getElementById('date-filter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    startDate = document.getElementById('start-date').value;
    endDate = document.getElementById('end-date').value;
    await loadCharts();
  });

  // Handle prediction form submission
  document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const descriptionLength = document.getElementById('description-length').value;
    const evidenceFiles = document.getElementById('evidence-files').value;
    const category = document.getElementById('category').value;
    const priority = document.getElementById('priority').value;
    try {
      const data = await mlApiRequest('/predict/resolution_time', 'POST', {
        complaint_description_length: parseInt(descriptionLength),
        num_evidence_files: parseInt(evidenceFiles),
        category,
        priority
      });
      const result = document.getElementById('prediction-result');
      result.textContent = `Predicted Resolution Time: ${data.predicted_resolution_time_days} days (${data.explanation})`;
      result.classList.remove('hidden');
    } catch (error) {
      displayError(error.message, '#prediction-form');
    }
  });

  // Retrain model
  window.retrainModel = async () => {
    try {
      const data = await mlApiRequest('/retrain_model', 'POST', null, token);
      alert(data.message);
      await loadCharts(); // Refresh charts after retraining
    } catch (error) {
      displayError(error.message);
    }
  };

  await loadCharts();
});