/**
 * Learning Tracker - Admin Dashboard
 */

// ============================================
// State
// ============================================
let adminData = {
  users: [],
  events: [],
  lessons: []
};
let filteredData = [];

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  await loadAdminData();
  renderDashboard();
  setupEventListeners();
});

/**
 * Load all admin data
 */
async function loadAdminData() {
  try {
    if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
      adminData = await window.LearningAPI.getAdminData();
    } else {
      // Load from localStorage for demo
      adminData = loadLocalAdminData();
    }
  } catch (error) {
    console.error('Error loading admin data:', error);
    adminData = loadLocalAdminData();
  }
  
  processData();
}

/**
 * Load admin data from localStorage (fallback/demo mode)
 */
function loadLocalAdminData() {
  const users = [];
  const events = [];
  const lessons = window.LearningAPI ? window.LearningAPI.getDefaultLessons() : [
    { id: 'lesson-1', title: 'Introduction to Modern Development', category: 'Fundamentals' },
    { id: 'lesson-2', title: 'Building Scalable Applications', category: 'Architecture' }
  ];
  
  // Scan localStorage for user data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (key === 'learningTrackerUser' || key.startsWith('learningTrackerUser_')) {
      try {
        const user = JSON.parse(localStorage.getItem(key));
        if (user && user.id && user.name) {
          users.push(user);
        }
      } catch (e) {}
    }
    
    if (key.startsWith('progress_')) {
      try {
        const userId = key.replace('progress_', '');
        const progress = JSON.parse(localStorage.getItem(key));
        
        Object.keys(progress).forEach(lessonId => {
          const p = progress[lessonId];
          if (p.clicked) {
            events.push({
              userId,
              lessonId,
              eventType: 'clicked',
              timestamp: p.clicked
            });
          }
          if (p.completed) {
            events.push({
              userId,
              lessonId,
              eventType: 'completed',
              timestamp: p.completed
            });
          }
        });
      } catch (e) {}
    }
  }
  
  // Also check the main user storage
  const mainUser = localStorage.getItem('learningTrackerUser');
  if (mainUser) {
    try {
      const user = JSON.parse(mainUser);
      if (user && user.id && user.name && !users.find(u => u.id === user.id)) {
        users.push(user);
      }
    } catch (e) {}
  }
  
  return { users, events, lessons };
}

/**
 * Process raw data into usable format
 */
function processData() {
  // Build user progress map
  adminData.users = adminData.users.map(user => {
    const userEvents = adminData.events.filter(e => e.userId === user.id);
    const progress = {};
    
    userEvents.forEach(event => {
      if (!progress[event.lessonId]) {
        progress[event.lessonId] = {};
      }
      progress[event.lessonId][event.eventType] = event.timestamp;
    });
    
    const completedCount = Object.values(progress).filter(p => p.completed).length;
    const startedCount = Object.values(progress).filter(p => p.clicked).length;
    
    return {
      ...user,
      progress,
      completedCount,
      startedCount,
      completionRate: adminData.lessons.length > 0 
        ? Math.round((completedCount / adminData.lessons.length) * 100) 
        : 0
    };
  });
  
  filteredData = [...adminData.users];
}

// ============================================
// UI Rendering
// ============================================

/**
 * Show loading state
 */
function showLoading() {
  const container = document.getElementById('dashboardContent');
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  `;
}

/**
 * Render the full dashboard
 */
function renderDashboard() {
  const container = document.getElementById('dashboardContent');
  
  if (adminData.users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>No user data yet. Users will appear here once they start using the learning tracker.</p>
      </div>
    `;
    return;
  }
  
  // Populate user filter
  populateUserFilter();
  
  // Render user cards
  renderUserCards();
  
  // Render data table
  renderDataTable();
}

/**
 * Populate user filter dropdown
 */
function populateUserFilter() {
  const select = document.getElementById('userFilter');
  select.innerHTML = '<option value="">All Users</option>';
  
  adminData.users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.name;
    select.appendChild(option);
  });
}

/**
 * Render user summary cards
 */
function renderUserCards() {
  const container = document.getElementById('userCards');
  
  container.innerHTML = filteredData.map(user => `
    <div class="user-card">
      <div class="user-card-header">
        <span class="user-card-name">${escapeHtml(user.name)}</span>
        <span class="user-card-stats">${user.completedCount}/${adminData.lessons.length} complete</span>
      </div>
      ${user.email ? `<div style="font-size: 0.8rem; color: var(--dark-gray); margin-bottom: 0.75rem;">${escapeHtml(user.email)}</div>` : ''}
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${user.completionRate}%"></div>
        </div>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--dark-gray);">
        ${user.completionRate}% completion rate
      </div>
    </div>
  `).join('');
}

/**
 * Render the detailed data table
 */
function renderDataTable() {
  const tbody = document.getElementById('tableBody');
  const rows = [];
  
  filteredData.forEach(user => {
    adminData.lessons.forEach(lesson => {
      const progress = user.progress[lesson.id] || {};
      const status = progress.completed ? 'completed' : (progress.clicked ? 'clicked' : 'not-started');
      const statusText = progress.completed ? 'Completed' : (progress.clicked ? 'In Progress' : 'Not Started');
      
      rows.push({
        userName: user.name,
        lessonTitle: lesson.title,
        status,
        statusText,
        clickedAt: progress.clicked || null,
        completedAt: progress.completed || null
      });
    });
  });
  
  // Apply status filter
  const statusFilter = document.getElementById('statusFilter').value;
  const filteredRows = statusFilter 
    ? rows.filter(r => r.status === statusFilter)
    : rows;
  
  tbody.innerHTML = filteredRows.map(row => `
    <tr>
      <td>${escapeHtml(row.userName)}</td>
      <td>${escapeHtml(row.lessonTitle)}</td>
      <td><span class="status-badge ${row.status}">${row.statusText}</span></td>
      <td>${row.clickedAt ? formatDateTime(row.clickedAt) : '-'}</td>
      <td>${row.completedAt ? formatDateTime(row.completedAt) : '-'}</td>
    </tr>
  `).join('');
  
  if (filteredRows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--dark-gray);">
          No data matching the current filters
        </td>
      </tr>
    `;
  }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById('userFilter').addEventListener('change', handleFilterChange);
  document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
  const userFilter = document.getElementById('userFilter').value;
  
  if (userFilter) {
    filteredData = adminData.users.filter(u => u.id === userFilter);
  } else {
    filteredData = [...adminData.users];
  }
  
  renderUserCards();
  renderDataTable();
}

/**
 * Export data to CSV
 */
function exportToCSV() {
  const rows = [['User Name', 'Email', 'Lesson Title', 'Status', 'First Clicked', 'Completed At']];
  
  adminData.users.forEach(user => {
    adminData.lessons.forEach(lesson => {
      const progress = user.progress[lesson.id] || {};
      const status = progress.completed ? 'Completed' : (progress.clicked ? 'In Progress' : 'Not Started');
      
      rows.push([
        user.name,
        user.email || '',
        lesson.title,
        status,
        progress.clicked ? formatDateTime(progress.clicked) : '',
        progress.completed ? formatDateTime(progress.completed) : ''
      ]);
    });
  });
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `learning-tracker-report-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast('Report exported successfully!', 'success');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format date and time
 */
function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} active`;
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

/**
 * Refresh data
 */
async function refreshData() {
  showLoading();
  await loadAdminData();
  renderDashboard();
  showToast('Data refreshed', 'info');
}

// Expose refresh function
window.refreshData = refreshData;
