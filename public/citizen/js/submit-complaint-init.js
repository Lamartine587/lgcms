import { loadHeader, loadSidebar, loadFooter } from '/js/shared.js';
import { submitComplaint } from '/citizen/js/complaints.js'; // Updated import path for complaints.js

document.addEventListener('DOMContentLoaded', () => {
    // Removed: requireAuth('citizen'); // Allow unauthenticated access for complaint submission

    loadHeader();
    loadSidebar(); // Load citizen sidebar
    loadFooter();

    const submitComplaintForm = document.getElementById('submitComplaintForm');
    const getGpsLocationBtn = document.getElementById('get-gps-location');
    const manualLocationInput = document.getElementById('manualLocation');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const locationStatus = document.getElementById('location-status');

    if (getGpsLocationBtn) {
        getGpsLocationBtn.addEventListener('click', () => {
            locationStatus.textContent = 'Getting your location...';
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        latitudeInput.value = position.coords.latitude;
                        longitudeInput.value = position.coords.longitude;
                        manualLocationInput.value = `Lat: ${position.coords.latitude}, Lon: ${position.coords.longitude}`;
                        locationStatus.textContent = 'Location obtained successfully!';
                        locationStatus.style.color = 'green';
                        manualLocationInput.readOnly = true;
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        locationStatus.textContent = 'Could not get location. Please enter manually.';
                        locationStatus.style.color = 'red';
                        manualLocationInput.readOnly = false;
                        latitudeInput.value = '';
                        longitudeInput.value = '';
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                locationStatus.textContent = 'Geolocation is not supported by your browser. Please enter location manually.';
                locationStatus.style.color = 'red';
                manualLocationInput.readOnly = false;
            }
        });
    }

    if (manualLocationInput) {
        manualLocationInput.addEventListener('input', () => {
            if (manualLocationInput.readOnly) {
                manualLocationInput.readOnly = false;
                latitudeInput.value = '';
                longitudeInput.value = '';
                locationStatus.textContent = '';
            }
        });
    }

    if (submitComplaintForm) {
        submitComplaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(submitComplaintForm);
            // Append location data to formData if available
            if (latitudeInput.value) formData.append('latitude', latitudeInput.value);
            if (longitudeInput.value) formData.append('longitude', longitudeInput.value);
            if (manualLocationInput.value) formData.append('locationText', manualLocationInput.value);

            try {
                // Call the submitComplaint function from complaints.js
                const result = await submitComplaint(formData); 
                alert(result.message || 'Complaint submitted successfully!');
                submitComplaintForm.reset(); // Clear form after successful submission
                // Clear location fields after reset
                latitudeInput.value = '';
                longitudeInput.value = '';
                manualLocationInput.value = '';
                locationStatus.textContent = '';
                manualLocationInput.readOnly = false;

                // Optionally redirect to my-complaints.html
                // window.location.href = '/citizen/my-complaints.html';
            } catch (error) {
                console.error('Complaint submission failed:', error.message);
                alert(error.message || 'An error occurred during complaint submission.');
            }
        });
    }
});
