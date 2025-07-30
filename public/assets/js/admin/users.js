let currentPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  const usersTable = document.getElementById('users-table');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const currentPageSpan = document.getElementById('current-page');
  const totalPagesSpan = document.getElementById('total-pages');

  async function loadUsers(page = 1) {
    try {
      const data = await apiRequest(`/admin/users?page=${page}`, 'GET', null, token);
      usersTable.innerHTML = '';
      data.data.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
        `;
        usersTable.appendChild(tr);
      });

      currentPage = data.data.currentPage;
      currentPageSpan.textContent = currentPage;
      totalPagesSpan.textContent = data.data.totalPages;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === data.data.totalPages;
    } catch (error) {
      displayError(error.message);
    }
  }

  prevPage.addEventListener('click', () => loadUsers(currentPage - 1));
  nextPage.addEventListener('click', () => loadUsers(currentPage + 1));
  loadUsers();
});