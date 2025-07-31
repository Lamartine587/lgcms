// Ensure DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost:5001'; // Matches app.py port

    // Chart instances
    let trendsChart = null;
    let departmentChart = null;
    let statusChart = null;
    let roleChart = null;
    let resolutionTimeChart = null;
    let heatmapLayer = null;
    let map = null;

    // Cache for API responses
    let dataCache = {
        complaint_trends: null,
        complaint_department_distribution: null,
        complaint_status_distribution: null,
        user_role_distribution: null,
        resolution_time_distribution: null,
        complaint_heatmap_data: null
    };

    // Fallback chart data
    const fallbackChartData = {
        type: 'bar',
        data: {
            labels: ['No Data'],
            datasets: [{
                label: 'No Data Available',
                data: [0],
                backgroundColor: '#ccc'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    };

    // Initialize Leaflet map
    function initializeMap() {
        const mapContainer = document.getElementById('heatmap-map');
        if (!mapContainer) {
            console.error('Map container #heatmap-map not found.');
            showMessage('error', 'Map container not found.');
            return;
        }

        mapContainer.style.height = '100%';
        mapContainer.style.width = '100%';

        function checkContainerHeight() {
            const height = mapContainer.offsetHeight;
            console.log('Map container height:', height);
            if (height > 0) {
                try {
                    map = L.map('heatmap-map').setView([0.2827, 34.7519], 10); // Center on Kakamega County
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);
                    map.invalidateSize(); // Ensure map resizes to full width
                    fetchHeatmapData();
                } catch (error) {
                    console.error('Error initializing map:', error);
                    showMessage('error', 'Failed to initialize map.');
                }
            } else {
                console.warn('Map container height is 0, retrying...');
                setTimeout(checkContainerHeight, 100);
            }
        }
        checkContainerHeight();
    }

    // Fetch heatmap data
    function fetchHeatmapData() {
        if (dataCache.complaint_heatmap_data) {
            renderHeatmap(dataCache.complaint_heatmap_data);
            return;
        }
        fetch(`${API_BASE_URL}/api/ml/complaint_heatmap_data`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log('Heatmap data:', data);
                dataCache.complaint_heatmap_data = data;
                renderHeatmap(data);
            })
            .catch(error => {
                console.error('Error fetching heatmap data:', error);
                showMessage('error', 'Error fetching heatmap data: ' + error.message);
            });
    }

    function renderHeatmap(data) {
        if (!data.success) {
            showMessage('error', data.message || 'Failed to load heatmap data.');
            return;
        }
        if (!data.data || data.data.length === 0) {
            showMessage('info', 'No heatmap data available.');
            return;
        }
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
        }
        // Ensure L.heatLayer is available
        if (typeof L.heatLayer === 'function') {
            heatmapLayer = L.heatLayer(data.data, {
                radius: 25,
                blur: 15,
                maxZoom: 17
            }).addTo(map);
            map.invalidateSize();
        } else {
            console.error('Leaflet Heatmap plugin not loaded.');
            showMessage('error', 'Heatmap plugin failed to load.');
        }
    }

    // Fetch all data and cache it
    function fetchData() {
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const trendsUrl = `${API_BASE_URL}/api/ml/complaint_trends?${params}`;

        const endpoints = [
            { key: 'complaint_trends', url: trendsUrl },
            { key: 'complaint_department_distribution', url: `${API_BASE_URL}/api/ml/complaint_department_distribution` },
            { key: 'complaint_status_distribution', url: `${API_BASE_URL}/api/ml/complaint_status_distribution` },
            { key: 'user_role_distribution', url: `${API_BASE_URL}/api/ml/user_role_distribution` },
            { key: 'resolution_time_distribution', url: `${API_BASE_URL}/api/ml/resolution_time_distribution` }
        ];

        Promise.all(
            endpoints.map(({ key, url }) =>
                fetch(url)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
                        return response.json().then(data => ({ key, data }));
                    })
                    .catch(error => ({ key, error }))
            )
        )
            .then(results => {
                results.forEach(({ key, data, error }) => {
                    if (error) {
                        console.error(`Error fetching ${key}:`, error);
                        showMessage('error', `Error fetching ${key.replace(/_/g, ' ')}: ${error.message}`);
                        dataCache[key] = { success: false };
                    } else {
                        console.log(`${key} data:`, data);
                        dataCache[key] = data;
                    }
                });
                updateDashboardCards();
                fetchAndRenderCharts();
            })
            .catch(error => {
                console.error('Error in fetchData:', error);
                showMessage('error', 'Failed to fetch data: ' + error.message);
            });
    }

    // Update dashboard cards using cached data
    function updateDashboardCards() {
        const volumeEl = document.getElementById('complaint-volume');
        const volumeChangeEl = document.getElementById('volume-change');
        const resolutionEl = document.getElementById('avg-resolution');
        const resolutionChangeEl = document.getElementById('resolution-change');
        const satisfactionEl = document.getElementById('satisfaction-rate');
        const feedbackEl = document.getElementById('feedback-count');
        const hotspotDeptEl = document.getElementById('hotspot-dept');
        const hotspotCountEl = document.getElementById('hotspot-count');

        const trendsData = dataCache.complaint_trends;
        if (volumeEl && volumeChangeEl && trendsData?.success && trendsData.data?.datasets?.[0]) {
            const totalComplaints = trendsData.data.datasets[0].data.reduce((a, b) => a + b, 0) || 0;
            volumeEl.textContent = totalComplaints;
            volumeChangeEl.textContent = 'N/A';
        } else if (volumeEl && volumeChangeEl) {
            volumeEl.textContent = '0';
            volumeChangeEl.textContent = 'N/A';
        }

        const resolutionData = dataCache.resolution_time_distribution;
        if (resolutionEl && resolutionChangeEl && resolutionData?.success && resolutionData.data?.datasets?.[0]) {
            const counts = resolutionData.data.datasets[0].data;
            const boundaries = [12, 48, 120, 252, 336];
            const totalComplaints = counts.reduce((a, b) => a + b, 0);
            let totalHours = 0;
            counts.forEach((count, index) => {
                totalHours += count * (boundaries[index] || 336);
            });
            const avgDays = totalComplaints ? (totalHours / totalComplaints / 24).toFixed(1) : 0;
            resolutionEl.textContent = `${avgDays} days`;
            resolutionChangeEl.textContent = 'N/A';
        } else if (resolutionEl && resolutionChangeEl) {
            resolutionEl.textContent = '0 days';
            resolutionChangeEl.textContent = 'N/A';
        }

        if (satisfactionEl && feedbackEl) {
            satisfactionEl.textContent = 'N/A';
            feedbackEl.textContent = '0';
        }

        const deptData = dataCache.complaint_department_distribution;
        if (hotspotDeptEl && hotspotCountEl && deptData?.success && deptData.data?.labels && deptData.data?.datasets?.[0]) {
            const departments = deptData.data.labels;
            const counts = deptData.data.datasets[0].data;
            const maxIndex = counts.indexOf(Math.max(...counts));
            hotspotDeptEl.textContent = departments[maxIndex] || 'None';
            hotspotCountEl.textContent = counts[maxIndex] || 0;
        } else if (hotspotDeptEl && hotspotCountEl) {
            hotspotDeptEl.textContent = 'None';
            hotspotCountEl.textContent = '0';
        }
    }

    // Fetch and render charts using cached data
    function fetchAndRenderCharts() {
        const canvases = ['trends-chart', 'department-chart', 'status-chart', 'role-chart', 'resolution-time-chart'];
        canvases.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '450px'; // Enforce height
            } else {
                console.error(`Canvas #${id} not found.`);
            }
        });

        // Trends Chart
        const trendsCanvas = document.getElementById('trends-chart');
        if (trendsCanvas) {
            const data = dataCache.complaint_trends;
            if (trendsChart) trendsChart.destroy();
            trendsChart = new Chart(trendsCanvas, {
                ...data?.success && data.data ? data.data : fallbackChartData,
                options: {
                    ...data?.success && data.data.options ? data.data.options : fallbackChartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    height: 450,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Department Chart
        const deptCanvas = document.getElementById('department-chart');
        if (deptCanvas) {
            const data = dataCache.complaint_department_distribution;
            if (departmentChart) departmentChart.destroy();
            departmentChart = new Chart(deptCanvas, {
                ...data?.success && data.data ? data.data : { ...fallbackChartData, type: 'doughnut' },
                options: {
                    ...data?.success && data.data.options ? data.data.options : fallbackChartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    height: 450,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Status Chart
        const statusCanvas = document.getElementById('status-chart');
        if (statusCanvas) {
            const data = dataCache.complaint_status_distribution;
            if (statusChart) statusChart.destroy();
            statusChart = new Chart(statusCanvas, {
                ...data?.success && data.data ? data.data : { ...fallbackChartData, type: 'pie' },
                options: {
                    ...data?.success && data.data.options ? data.data.options : fallbackChartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    height: 450,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Role Chart
        const roleCanvas = document.getElementById('role-chart');
        if (roleCanvas) {
            const data = dataCache.user_role_distribution;
            if (roleChart) roleChart.destroy();
            roleChart = new Chart(roleCanvas, {
                ...data?.success && data.data ? data.data : fallbackChartData,
                options: {
                    ...data?.success && data.data.options ? data.data.options : fallbackChartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    height: 450,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Resolution Time Chart
        const resolutionCanvas = document.getElementById('resolution-time-chart');
        if (resolutionCanvas) {
            const data = dataCache.resolution_time_distribution;
            if (resolutionTimeChart) resolutionTimeChart.destroy();
            resolutionTimeChart = new Chart(resolutionCanvas, {
                ...data?.success && data.data ? data.data : fallbackChartData,
                options: {
                    ...data?.success && data.data.options ? data.data.options : fallbackChartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    height: 450,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    // Handle chart type toggles
    document.querySelectorAll('.chart-toggle').forEach(button => {
        button.addEventListener('click', function () {
            const chart = this.dataset.chart;
            const type = this.dataset.type;
            document.querySelectorAll(`.chart-toggle[data-chart="${chart}"]`).forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            if (chart === 'trends' && trendsChart) {
                trendsChart.config.type = type;
                trendsChart.update();
            } else if (chart === 'department' && departmentChart) {
                departmentChart.config.type = type;
                departmentChart.update();
            }
        });
    });

    // Handle date filter form submission
    const dateFilterForm = document.getElementById('date-filter-form');
    if (dateFilterForm) {
        dateFilterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            dataCache = {}; // Clear cache
            fetchData();
            fetchHeatmapData();
            showMessage('success', 'Data filtered successfully.');
        });
    }

    // Handle prediction form submission
    const predictionForm = document.getElementById('prediction-form');
    if (predictionForm) {
        predictionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const data = {
                complaint_description_length: parseInt(document.getElementById('description-length').value) || 0,
                num_evidence_files: parseInt(document.getElementById('evidence-files').value) || 0,
                category: document.getElementById('category').value || '',
                priority: document.getElementById('priority').value || ''
            };

            fetch(`${API_BASE_URL}/api/ml/predict/resolution_time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    console.log('Prediction data:', data);
                    const resultElement = document.getElementById('prediction-result');
                    if (resultElement) {
                        if (data.success) {
                            resultElement.textContent = `Predicted Resolution Time: ${data.prediction_hours} hours. ${data.message}`;
                            resultElement.classList.remove('hidden');
                            showMessage('success', 'Prediction generated successfully.');
                        } else {
                            resultElement.textContent = `Error: ${data.message}`;
                            resultElement.classList.remove('hidden');
                            showMessage('error', 'Failed to generate prediction: ' + data.message);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error predicting resolution time:', error);
                    showMessage('error', 'Error predicting resolution time: ' + error.message);
                });
        });
    }

    // Handle refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            const startDate = document.getElementById('start-date');
            const endDate = document.getElementById('end-date');
            if (startDate && endDate) {
                startDate.value = '';
                endDate.value = '';
                dataCache = {}; // Clear cache
                fetchData();
                fetchHeatmapData();
                showMessage('success', 'Data refreshed successfully.');
            }
        });
    }

    // Handle retrain model
    window.retrainModel = function () {
        fetch(`${API_BASE_URL}/api/ml/retrain_model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log('Retrain model data:', data);
                if (data.success) {
                    showMessage('success', data.message);
                    dataCache = {}; // Clear cache
                    fetchData();
                    fetchHeatmapData();
                } else {
                    showMessage('error', 'Failed to retrain model: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error retraining model:', error);
                showMessage('error', 'Error retraining model: ' + error.message);
            });
    };

    // Show message
    function showMessage(type, message) {
        const messageContainer = document.getElementById('message-container');
        const messageContent = document.getElementById('message-content');
        if (messageContainer && messageContent) {
            messageContent.textContent = message;
            messageContainer.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-blue-100', 'text-blue-700');
            if (type === 'error') {
                messageContainer.classList.add('bg-red-100', 'text-red-700');
            } else if (type === 'info') {
                messageContainer.classList.add('bg-blue-100', 'text-blue-700');
            } else {
                messageContainer.classList.add('bg-green-100', 'text-green-700');
            }
            setTimeout(() => {
                messageContainer.classList.add('hidden');
            }, 5000);
        }
    }

    // Initialize
    initializeMap();
    fetchData();
});