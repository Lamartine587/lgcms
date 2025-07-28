async function loadPartial(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;

        // Sidebar logic
        if (elementId === 'sidebar-placeholder') {
            // Sidebar logout
            const sidebarLogout = document.getElementById('sidebarLogout');
            if (sidebarLogout) {
                sidebarLogout.addEventListener('click', () => {
                    localStorage.removeItem('userInfo');
                    window.location.href = '../citizen/login.html';
                });
            }
            // Mobile toggle (optional, can be added later)
        }

        const navLogout = document.getElementById('navLogout');
        if (navLogout) {
            navLogout.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('userInfo');
                window.location.href = 'login.html'; // Path relative to current admin folder for logout
            });
        }

        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (navLogout) {
            if (userInfo && userInfo.token) {
                navLogout.textContent = 'Logout';
                navLogout.href = '#';
            } else {
                navLogout.textContent = 'Login';
                navLogout.href = 'login.html'; // Path relative to current admin folder for login
            }
        }

    } catch (error) {
        console.error(`Could not load partial ${url}:`, error);
    }
}

// Helper: Require login for protected pages
function requireLogin() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
        window.location.href = '../citizen/login.html';
    }
}