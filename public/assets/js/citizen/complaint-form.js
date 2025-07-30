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
      await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        body: formData,
      }).then(res => res.json()).then(data => {
        if (data.success) {
          alert('Complaint submitted successfully!');
          window.location.href = '/citizen/login.html';
        } else {
          displayError(data.error);
        }
      });
    } catch (error) {
      displayError('Failed to submit complaint');
    }
  });
});