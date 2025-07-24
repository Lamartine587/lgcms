// Handle file upload preview for both regular and anonymous complaints
function handleFileUpload(inputElement, previewElement) {
    previewElement.innerHTML = '';
    const files = inputElement.files;
    
    if (files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type.split('/')[0];
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';
        
        if (fileType === 'image') {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewItem.appendChild(img);
        } else if (file.type.includes('pdf')) {
            previewItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas fa-file-pdf"></i>
                    <span>${file.name}</span>
                </div>
            `;
        } else if (fileType === 'video') {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            previewItem.appendChild(video);
        } else {
            previewItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                </div>
            `;
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => removeFile(inputElement, previewElement, i));
        
        previewItem.appendChild(removeBtn);
        previewElement.appendChild(previewItem);
    }
}

function removeFile(inputElement, previewElement, index) {
    const dt = new DataTransfer();
    const files = inputElement.files;
    
    for (let i = 0; i < files.length; i++) {
        if (i !== index) dt.items.add(files[i]);
    }
    
    inputElement.files = dt.files;
    handleFileUpload(inputElement, previewElement);
}

// Initialize complaint form functionality
document.addEventListener('DOMContentLoaded', function() {
    // Regular complaint form elements
    const complaintEvidence = document.getElementById('complaint-evidence');
    const filePreview = document.getElementById('file-preview');
    const complaintForm = document.getElementById('complaint-form');

    // Anonymous complaint form elements
    const anonymousEvidence = document.getElementById('anonymous-evidence');
    const anonymousFilePreview = document.getElementById('anonymous-file-preview');
    const anonymousForm = document.getElementById('anonymous-complaint-form');
    const showAnonymousBtn = document.getElementById('show-anonymous-btn');

    // Initialize file upload handlers if elements exist
    if (complaintEvidence && filePreview) {
        complaintEvidence.addEventListener('change', function() {
            handleFileUpload(complaintEvidence, filePreview);
        });
    }

    if (anonymousEvidence && anonymousFilePreview) {
        anonymousEvidence.addEventListener('change', function() {
            handleFileUpload(anonymousEvidence, anonymousFilePreview);
        });
    }

    // Toggle anonymous form visibility
    if (showAnonymousBtn) {
        showAnonymousBtn.addEventListener('click', function(e) {
            e.preventDefault();
            anonymousForm.style.display = anonymousForm.style.display === 'none' ? 'block' : 'none';
            this.innerHTML = anonymousForm.style.display === 'none' ? 
                '<i class="fas fa-user-secret"></i> Submit Anonymously' : 
                '<i class="fas fa-times"></i> Cancel';
        });
    }

    // Handle regular complaint submission
    if (complaintForm) {
        complaintForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const complaintMessage = document.getElementById('complaint-message');
            const complaintError = document.getElementById('complaint-error');
            
            formData.append('category', document.getElementById('complaint-category').value);
            formData.append('description', document.getElementById('complaint-description').value);
            formData.append('location', document.getElementById('complaint-location').value);
            
            // Add all files
            const files = complaintEvidence.files;
            for (let i = 0; i < files.length; i++) {
                formData.append('evidence', files[i]);
            }
            
            try {
                const response = await fetch('/api/complaints', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to submit complaint');
                }

                displayMessage(complaintMessage, 'Complaint submitted successfully!', false);
                
                // Reset form and preview
                complaintForm.reset();
                filePreview.innerHTML = '';
                
                // Redirect to complaints list
                setTimeout(() => {
                    window.location.href = '/my-complaints.html';
                }, 1500);
            } catch (error) {
                displayMessage(complaintError, error.message, true);
            }
        });
    }

    // Handle anonymous complaint submission
    if (anonymousForm) {
        anonymousForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const anonymousMessage = document.getElementById('anonymous-message');
            const anonymousError = document.getElementById('anonymous-error');
            
            formData.append('category', document.getElementById('anonymous-category').value);
            formData.append('description', document.getElementById('anonymous-description').value);
            formData.append('location', document.getElementById('anonymous-location').value);
            formData.append('contactEmail', document.getElementById('anonymous-email').value || '');
            
            // Add all files
            const files = anonymousEvidence.files;
            for (let i = 0; i < files.length; i++) {
                formData.append('evidence', files[i]);
            }
            
            try {
                const response = await fetch('/api/complaints/anonymous', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to submit anonymous complaint');
                }

                displayMessage(anonymousMessage, 
                    `Anonymous complaint submitted successfully! Reference ID: ${data.referenceId}` + 
                    (data.contactEmail ? ' (Updates will be sent to your email)' : ''), 
                    false);
                
                // Reset form and preview
                anonymousForm.reset();
                anonymousFilePreview.innerHTML = '';
                
            } catch (error) {
                displayMessage(anonymousError, error.message, true);
            }
        });
    }
});

// Utility function to display messages
function displayMessage(element, message, isError) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = isError ? '#dc3545' : '#28a745';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Handle my complaints page
if (window.location.pathname === '/my-complaints.html') {
    document.addEventListener('DOMContentLoaded', function() {
        loadMyComplaints();
        
        // Status filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterComplaints(btn.dataset.status);
            });
        });
    });
}

async function loadMyComplaints() {
    const complaintsList = document.getElementById('citizen-complaints-list');
    const errorElement = document.getElementById('my-complaints-error');
    
    if (!complaintsList) return;
    
    complaintsList.innerHTML = '<div class="loading-spinner"></div>';
    errorElement.textContent = '';
    
    try {
        const response = await fetch('/api/complaints', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load complaints');
        }
        
        const complaints = await response.json();
        
        if (complaints.length === 0) {
            complaintsList.innerHTML = '<p class="no-complaints">No complaints submitted yet.</p>';
            return;
        }
        
        renderComplaintsList(complaintsList, complaints);
    } catch (error) {
        complaintsList.innerHTML = '';
        displayMessage(errorElement, error.message, true);
    }
}

function renderComplaintsList(container, complaints) {
    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-card" data-id="${complaint._id}" data-status="${complaint.status}">
            <h3>
                ${complaint.category} 
                <span class="status-badge" data-status="${complaint.status}">${complaint.status}</span>
            </h3>
            <p><strong>Description:</strong> ${complaint.description}</p>
            <p><strong>Location:</strong> ${complaint.location}</p>
            <p><strong>Submitted:</strong> ${new Date(complaint.createdAt).toLocaleDateString()}</p>
            <a href="/complaint-detail.html?id=${complaint._id}" class="view-detail-btn">
                <i class="fas fa-eye"></i> View Details
            </a>
        </div>
    `).join('');
}

function filterComplaints(status) {
    const complaintsList = document.getElementById('citizen-complaints-list');
    if (!complaintsList) return;
    
    const allComplaints = Array.from(complaintsList.querySelectorAll('.complaint-card'));
    
    allComplaints.forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}