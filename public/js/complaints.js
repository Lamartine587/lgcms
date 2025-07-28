const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const submitComplaintForm = document.getElementById('submitComplaintForm');
    if (submitComplaintForm) {
        submitComplaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));

            if (!userInfo || !userInfo.token) {
                alert('You must be logged in to submit a complaint.');
                window.location.href = 'login.html'; // Path relative to current admin folder
                return;
            }

            if (!title) {
                alert('Please select a complaint category.');
                return;
            }

            const evidenceImagesInput = document.getElementById('evidenceImages');
            const evidenceVideosInput = document.getElementById('evidenceVideos');
            const evidencePdfsInput = document.getElementById('evidencePdfs');

            const evidenceImages = [];
            const evidenceVideos = [];
            const evidencePdfs = [];

            if (evidenceImagesInput.files.length > 0) {
                for (let i = 0; i < evidenceImagesInput.files.length; i++) {
                    evidenceImages.push(`https://placehold.co/300x200/FF0000/FFFFFF?text=Image_${i+1}`);
                }
            }

            if (evidenceVideosInput.files.length > 0) {
                for (let i = 0; i < evidenceVideosInput.files.length; i++) {
                    evidenceVideos.push(`https://example.com/videos/video_${i+1}.mp4`);
                }
            }

            if (evidencePdfsInput.files.length > 0) {
                for (let i = 0; i < evidencePdfsInput.files.length; i++) {
                    evidencePdfs.push(`https://example.com/pdfs/document_${i+1}.pdf`);
                }
            }

            try {
                const res = await fetch(`${API_URL}/complaints`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                    body: JSON.stringify({
                        title,
                        description,
                        evidenceImages,
                        evidenceVideos,
                        evidencePdfs
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    alert('Complaint submitted successfully!');
                    submitComplaintForm.reset();
                    window.location.href = 'my-complaints.html'; // Path relative to current admin folder
                } else {
                    alert(data.message || 'Failed to submit complaint');
                }
            } catch (error) {
                console.error('Error submitting complaint:', error);
                alert('An error occurred during complaint submission. Please try again.');
            }
        });
    }
});

async function fetchMyComplaints() {
    const complaintsList = document.getElementById('complaintsList');
    const noComplaintsMessage = document.getElementById('noComplaintsMessage');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo || !userInfo.token) {
        if (noComplaintsMessage) noComplaintsMessage.textContent = 'Please log in to view your complaints.';
        if (complaintsList) complaintsList.innerHTML = '';
        window.location.href = 'login.html'; // Path relative to current admin folder
        return;
    }

    try {
        const res = await fetch(`${API_URL}/complaints`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });

        const complaints = await res.json();

        if (res.ok) {
            if (complaints.length === 0) {
                if (noComplaintsMessage) noComplaintsMessage.classList.remove('hidden');
                if (complaintsList) complaintsList.innerHTML = '';
            } else {
                if (noComplaintsMessage) noComplaintsMessage.classList.add('hidden');
                if (complaintsList) {
                    complaintsList.innerHTML = complaints.map(complaint => `
                        <div class="complaint-card bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 class="text-xl font-bold text-gray-900 mb-3">${complaint.title}</h3>
                            <p class="text-gray-700 mb-4 flex-grow line-clamp-3">${complaint.description}</p>
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-sm text-gray-600">Status:</span>
                                <span class="status-badge status-${complaint.status.replace(/\s/g, '')}">${complaint.status}</span>
                            </div>
                            <p class="text-xs text-gray-500 mb-4">Submitted: ${new Date(complaint.createdAt).toLocaleDateString()}</p>
                            <a href="complaint-detail.html?id=${complaint._id}"
                               class="mt-auto inline-block text-center px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
                                      hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105">
                                View Details
                            </a>
                        </div>
                    `).join('');
                }
            }
        } else {
            alert(complaints.message || 'Failed to fetch complaints');
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html'; // Path relative to current admin folder
        }
    } catch (error) {
        console.error('Error fetching complaints:', error);
        alert('An error occurred while fetching complaints. Please try again.');
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html'; // Path relative to current admin folder
    }
}

async function fetchComplaintDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    if (!complaintId) {
        alert('No complaint ID provided.');
        window.location.href = 'my-complaints.html'; // Path relative to current admin folder
        return;
    }

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo || !userInfo.token) {
        alert('You must be logged in to view complaint details.');
        window.location.href = 'login.html'; // Path relative to current admin folder
        return;
    }

    try {
        const res = await fetch(`${API_URL}/complaints/${complaintId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });

        const complaint = await res.json();

        if (res.ok) {
            document.getElementById('detailTitle').textContent = complaint.title;
            document.getElementById('detailDescription').textContent = complaint.description;
            const statusSpan = document.getElementById('detailStatus');
            statusSpan.textContent = complaint.status;
            statusSpan.className = `font-bold status-badge status-${complaint.status.replace(/\s/g, '')}`;
            document.getElementById('detailUser').textContent = complaint.user ? complaint.user.fullName || complaint.user.username : 'Unknown User';
            document.getElementById('detailDate').textContent = new Date(complaint.createdAt).toLocaleDateString();

            const evidenceImagesDiv = document.getElementById('evidenceImages');
            const evidenceVideosDiv = document.getElementById('evidenceVideos');
            const evidencePdfsDiv = document.getElementById('evidencePdfs');
            const noEvidenceMessage = document.getElementById('noEvidenceMessage');

            let hasEvidence = false;

            if (complaint.evidenceImages && complaint.evidenceImages.length > 0) {
                hasEvidence = true;
                evidenceImagesDiv.innerHTML = complaint.evidenceImages.map(url => `
                    <a href="${url}" target="_blank" class="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
                        <img src="${url}" alt="Evidence Image" class="w-full h-32 object-cover">
                    </a>
                `).join('');
            } else {
                evidenceImagesDiv.innerHTML = '';
            }

            if (complaint.evidenceVideos && complaint.evidenceVideos.length > 0) {
                hasEvidence = true;
                evidenceVideosDiv.innerHTML = complaint.evidenceVideos.map(url => `
                    <div class="flex items-center space-x-2 bg-gray-100 p-3 rounded-md shadow-sm">
                        <i class="fas fa-video text-blue-500 text-xl"></i>
                        <a href="${url}" target="_blank" class="text-blue-600 hover:underline truncate">${url.split('/').pop()}</a>
                    </div>
                `).join('');
            } else {
                evidenceVideosDiv.innerHTML = '';
            }

            if (complaint.evidencePdfs && complaint.evidencePdfs.length > 0) {
                hasEvidence = true;
                evidencePdfsDiv.innerHTML = complaint.evidencePdfs.map(url => `
                    <div class="flex items-center space-x-2 bg-gray-100 p-3 rounded-md shadow-sm">
                        <i class="fas fa-file-pdf text-red-500 text-xl"></i>
                        <a href="${url}" target="_blank" class="text-blue-600 hover:underline truncate">${url.split('/').pop()}</a>
                    </div>
                `).join('');
            } else {
                evidencePdfsDiv.innerHTML = '';
            }

            if (hasEvidence) {
                noEvidenceMessage.classList.add('hidden');
            } else {
                noEvidenceMessage.classList.remove('hidden');
            }

            const adminFeedbackText = document.getElementById('detailAdminFeedback');
            const noAdminFeedbackMessage = document.getElementById('noAdminFeedbackMessage');

            if (complaint.adminFeedback) {
                adminFeedbackText.textContent = complaint.adminFeedback;
                adminFeedbackText.classList.remove('hidden');
                noAdminFeedbackMessage.classList.add('hidden');
            } else {
                adminFeedbackText.textContent = '';
                adminFeedbackText.classList.add('hidden');
                noAdminFeedbackMessage.classList.remove('hidden');
            }

        } else {
            alert(complaint.message || 'Failed to fetch complaint details');
            window.location.href = 'my-complaints.html';
        }
    } catch (error) {
        console.error('Error fetching complaint details:', error);
        alert('An error occurred while fetching complaint details. Please try again.');
        window.location.href = 'my-complaints.html';
    }
}