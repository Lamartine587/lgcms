export async function submitComplaint(formData) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch('/api/complaints', {
            method: 'POST',
            headers: {
                // IMPORTANT: Do NOT set 'Content-Type': 'application/json' when sending FormData with files.
                // The browser will automatically set the correct 'multipart/form-data' header.
                'Authorization': `Bearer ${token}`
            },
            body: formData // Send the FormData object directly
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Complaint submission failed');
        }

        return data; // Return success data from the backend
    } catch (error) {
        console.error('Error submitting complaint:', error);
        throw error; // Re-throw to be handled by the caller (submit-complaint-init.js)
    }
}