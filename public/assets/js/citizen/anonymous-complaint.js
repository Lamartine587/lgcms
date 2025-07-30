document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('complaint-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('category').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('locationText', document.getElementById('locationText').value);
    const files = document.getElementById('evidenceImages').files;
    for (let i = 0; i < files.length; i++) {
      formData.append('evidenceImages', files[i]);
    }

    try {
      const data = await apiRequest('/complaints', 'POST', formData, null, true);
      alert('Complaint submitted successfully!');
      window.location.href = '/citizen/login.html';
    } catch (error) {
      displayError(error.message);
    }
  });
});