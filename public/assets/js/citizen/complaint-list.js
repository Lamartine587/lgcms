document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/citizen/login.html';
    return;
  }

  try {
    const data = await apiRequest('/complaints/my-complaints', 'GET', null, token);
    const complaintsTable = document.getElementById('complaints-table');
    data.data.complaints.forEach(complaint => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${complaint.title}</td>
        <td>${complaint.category}</td>
        <td>${complaint.status}</td>
        <td>${formatDate(complaint.createdAt)}</td>
      `;
      complaintsTable.appendChild(tr);
    });
  } catch (error) {
    displayError(error.message);
  }
});