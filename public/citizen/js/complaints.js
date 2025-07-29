// public/js/complaints.js

/**
 * Submits a new complaint to the backend API, including files and location data.
 * It sends an authentication token if available, allowing both authenticated and anonymous submissions.
 * @param {FormData} formData - The FormData object containing all form fields and files.
 * @returns {Promise<Object>} - A promise that resolves with the API response data.
 */
export async function submitComplaint(formData) {
    try {
        const token = localStorage.getItem('token');
        
        const headers = {};
        // Only add the Authorization header if a token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // IMPORTANT: Do NOT set 'Content-Type': 'application/json' when sending FormData with files.
        // The browser will automatically set the correct 'multipart/form-data' header.

        const response = await fetch('/api/complaints', {
            method: 'POST',
            headers: headers, // Use the dynamically created headers
            body: formData // Send the FormData object directly
        });

        const data = await response.json();

        if (!response.ok) {
            // If the server responded with an error, throw it
            throw new Error(data.message || 'Complaint submission failed');
        }

        return data; // Return success data from the backend
    } catch (error) {
        console.error('Error submitting complaint:', error);
        throw error; // Re-throw to be handled by the caller (submit-complaint-init.js)
    }
}
