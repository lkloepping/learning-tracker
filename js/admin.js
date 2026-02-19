/**
 * Learning Tracker - Admin Dashboard
 */

// ============================================
// State
// ============================================
let adminData = {
  users: [],
  events: [],
  lessons: [],
  roster: []
};
let filteredData = [];
let executiveReport = { byCourse: [], byLesson: [] };

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
  const roster = [];
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
  
  return { users, events, lessons, courses: [], roster };
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
  
  // Build executive report (roster-based completion %)
  computeExecutiveReport();
}

/**
 * Get roster filtered by practice and status
 */
function getFilteredRoster() {
  const practiceFilter = document.getElementById('rosterPracticeFilter');
  const statusFilter = document.getElementById('rosterStatusFilter');
  const practiceValue = practiceFilter ? practiceFilter.value : '';
  const statusValue = statusFilter ? statusFilter.value : '';
  let roster = adminData.roster || [];
  if (practiceValue) {
    roster = roster.filter(r => (r.practice || '').trim() === practiceValue);
  }
  if (statusValue) {
    roster = roster.filter(r => (r.status || '').trim() === statusValue);
  }
  return roster;
}

/**
 * Compute completion rates by roster (for executive report)
 */
function computeExecutiveReport() {
  const roster = getFilteredRoster();
  const emailToUser = {};
  (adminData.users || []).forEach(u => {
    const email = (u.email || '').toString().trim().toLowerCase();
    if (email) emailToUser[email] = u;
  });
  
  const n = roster.length;
  executiveReport = { byCourse: [], byLesson: [], rosterSize: n };
  
  if (n === 0) {
    return;
  }
  
  // Group lessons by course
  const lessonsByCourse = {};
  (adminData.lessons || []).forEach(lesson => {
    const cid = lesson.courseId || 'Uncategorized';
    if (!lessonsByCourse[cid]) lessonsByCourse[cid] = [];
    lessonsByCourse[cid].push(lesson);
  });
  
  // By course
  Object.keys(lessonsByCourse).forEach(courseId => {
    const courseLessons = lessonsByCourse[courseId];
    const courseName = courseId;
    let completed = 0, inProgress = 0, notStarted = 0;
    roster.forEach(r => {
      const user = emailToUser[r.email];
      if (!user) {
        notStarted++;
        return;
      }
      const completedInCourse = courseLessons.filter(l => user.progress[l.id] && user.progress[l.id].completed).length;
      const startedInCourse = courseLessons.filter(l => user.progress[l.id] && user.progress[l.id].clicked).length;
      if (completedInCourse === courseLessons.length) completed++;
      else if (startedInCourse > 0) inProgress++;
      else notStarted++;
    });
    const course = (adminData.courses || []).find(c => c.id === courseId);
    const courseName = course ? course.title : courseId;
    executiveReport.byCourse.push({
      courseId,
      courseName,
      rosterN: n,
      pctCompleted: Math.round((completed / n) * 100),
      pctInProgress: Math.round((inProgress / n) * 100),
      pctNotStarted: Math.round((notStarted / n) * 100),
      completed,
      inProgress,
      notStarted
    });
  });
  
  // By lesson
  (adminData.lessons || []).forEach(lesson => {
    let completed = 0, inProgress = 0, notStarted = 0;
    roster.forEach(r => {
      const user = emailToUser[r.email];
      if (!user) {
        notStarted++;
        return;
      }
      const p = user.progress[lesson.id] || {};
      if (p.completed) completed++;
      else if (p.clicked) inProgress++;
      else notStarted++;
    });
    executiveReport.byLesson.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.courseId || 'Uncategorized',
      rosterN: n,
      pctCompleted: Math.round((completed / n) * 100),
      pctInProgress: Math.round((inProgress / n) * 100),
      pctNotStarted: Math.round((notStarted / n) * 100),
      completed,
      inProgress,
      notStarted
    });
  });
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
  
  // Restore the HTML structure if it was replaced by loading state
  if (!document.getElementById('userCards')) {
    container.innerHTML = `
      <!-- Executive Report -->
      <section class="executive-report-section" id="executiveReportSection">
        <h2 class="section-title">Executive Summary (by Roster)</h2>
        <div class="executive-filters">
          <label>Practice:</label>
          <select id="rosterPracticeFilter"><option value="">All practices</option></select>
          <label>Roster status:</label>
          <select id="rosterStatusFilter"><option value="">All on roster</option></select>
          <button class="btn-export" id="exportExecutiveBtn">Export Executive Report (CSV)</button>
        </div>
        <p class="executive-roster-size" id="executiveRosterSize"></p>
        <div class="report-tables">
          <div class="data-table-container">
            <h3>By Course</h3>
            <table class="data-table" id="executiveCourseTable">
              <thead><tr><th>Course</th><th>Roster N</th><th>% Completed</th><th>% In Progress</th><th>% Not Started</th></tr></thead>
              <tbody id="executiveCourseBody"></tbody>
            </table>
          </div>
          <div class="data-table-container">
            <h3>By Lesson</h3>
            <table class="data-table" id="executiveLessonTable">
              <thead><tr><th>Lesson</th><th>Course</th><th>Roster N</th><th>% Completed</th><th>% In Progress</th><th>% Not Started</th></tr></thead>
              <tbody id="executiveLessonBody"></tbody>
            </table>
          </div>
        </div>
      </section>
      <!-- User Cards -->
      <div class="user-cards-grid" id="userCards"></div>
      <!-- Data Table -->
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Lesson</th>
              <th>Status</th>
              <th>First Clicked</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>
    `;
    document.getElementById('exportExecutiveBtn').addEventListener('click', exportExecutiveReport);
    const rosterStatusEl = document.getElementById('rosterStatusFilter');
    const rosterPracticeEl = document.getElementById('rosterPracticeFilter');
    if (rosterStatusEl) rosterStatusEl.addEventListener('change', () => { computeExecutiveReport(); renderExecutiveReport(); });
    if (rosterPracticeEl) rosterPracticeEl.addEventListener('change', () => { computeExecutiveReport(); renderExecutiveReport(); });
  }
  
  // Populate filters
  populateUserFilter();
  populateCourseFilter();
  populateLessonFilter();
  populateRosterStatusFilter();
  populateRosterPracticeFilter();
  
  // Render executive report (roster-based)
  renderExecutiveReport();
  
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
 * Populate course filter dropdown
 */
function populateCourseFilter() {
  const select = document.getElementById('courseFilter');
  if (!select) return;
  
  select.innerHTML = '<option value="">All Courses</option>';
  
  // Get unique courses from lessons
  const courses = [...new Map(adminData.lessons.map(lesson => [lesson.courseId, lesson.courseId])).values()];
  
  courses.forEach(courseId => {
    const option = document.createElement('option');
    option.value = courseId;
    option.textContent = courseId || 'Uncategorized';
    select.appendChild(option);
  });
}

/**
 * Populate lesson filter dropdown
 */
function populateLessonFilter() {
  const select = document.getElementById('lessonFilter');
  if (!select) return;
  
  select.innerHTML = '<option value="">All Lessons</option>';
  
  adminData.lessons.forEach(lesson => {
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = lesson.title;
    select.appendChild(option);
  });
}

/**
 * Populate roster status filter from roster data
 */
function populateRosterStatusFilter() {
  const select = document.getElementById('rosterStatusFilter');
  if (!select) return;
  
  const statuses = [...new Set((adminData.roster || []).map(r => (r.status || '').trim()).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All on roster</option>';
  statuses.forEach(s => {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = s;
    select.appendChild(option);
  });
}

/**
 * Populate roster practice filter from roster data
 */
function populateRosterPracticeFilter() {
  const select = document.getElementById('rosterPracticeFilter');
  if (!select) return;
  
  const practices = [...new Set((adminData.roster || []).map(r => (r.practice || '').trim()).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All practices</option>';
  practices.forEach(p => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    select.appendChild(option);
  });
}

/**
 * Render executive report tables
 */
function renderExecutiveReport() {
  const section = document.getElementById('executiveReportSection');
  const sizeEl = document.getElementById('executiveRosterSize');
  const courseBody = document.getElementById('executiveCourseBody');
  const lessonBody = document.getElementById('executiveLessonBody');
  
  if (!section) return;
  
  const n = executiveReport.rosterSize || 0;
  if (n === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  if (sizeEl) {
    const practiceFilter = document.getElementById('rosterPracticeFilter');
    const statusFilter = document.getElementById('rosterStatusFilter');
    const practiceLabel = practiceFilter && practiceFilter.value ? ` Practice: ${practiceFilter.value}` : '';
    const statusLabel = statusFilter && statusFilter.value ? ` Status: ${statusFilter.value}` : '';
    const filterLabel = (practiceLabel || statusLabel) ? ` —${practiceLabel}${statusLabel}` : '';
    sizeEl.textContent = `Roster size: ${n}${filterLabel}. Completion rates below are % of this roster.`;
  }
  
  if (courseBody) {
    courseBody.innerHTML = executiveReport.byCourse.map(row => `
      <tr>
        <td>${escapeHtml(row.courseName)}</td>
        <td>${row.rosterN}</td>
        <td>${row.pctCompleted}%</td>
        <td>${row.pctInProgress}%</td>
        <td>${row.pctNotStarted}%</td>
      </tr>
    `).join('');
  }
  
  if (lessonBody) {
    lessonBody.innerHTML = executiveReport.byLesson.map(row => {
      const course = (adminData.courses || []).find(c => c.id === row.courseId);
      const courseName = course ? course.title : row.courseId;
      return `
        <tr>
          <td>${escapeHtml(row.lessonTitle)}</td>
          <td>${escapeHtml(courseName)}</td>
          <td>${row.rosterN}</td>
          <td>${row.pctCompleted}%</td>
          <td>${row.pctInProgress}%</td>
          <td>${row.pctNotStarted}%</td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Export executive report as CSV for monthly reporting
 */
function exportExecutiveReport() {
  const practiceFilter = document.getElementById('rosterPracticeFilter');
  const statusFilter = document.getElementById('rosterStatusFilter');
  const practiceLabel = practiceFilter && practiceFilter.value ? practiceFilter.value.replace(/\s+/g, '-') : 'All';
  const statusLabel = statusFilter && statusFilter.value ? statusFilter.value.replace(/\s+/g, '-') : 'All';
  const date = new Date().toISOString().split('T')[0];
  
  const rows = [
    ['Executive Learning Report', date, 'Practice: ' + (practiceFilter && practiceFilter.value ? practiceFilter.value : 'All'), 'Status: ' + (statusFilter && statusFilter.value ? statusFilter.value : 'All'), 'Roster N: ' + (executiveReport.rosterSize || 0)],
    [],
    ['By Course', '', '', '', ''],
    ['Course', 'Roster N', '% Completed', '% In Progress', '% Not Started'],
    ...executiveReport.byCourse.map(r => [r.courseName, r.rosterN, r.pctCompleted + '%', r.pctInProgress + '%', r.pctNotStarted + '%']),
    [],
    ['By Lesson', '', '', '', '', ''],
    ['Lesson', 'Course', 'Roster N', '% Completed', '% In Progress', '% Not Started'],
    ...executiveReport.byLesson.map(r => {
      const course = (adminData.courses || []).find(c => c.id === r.courseId);
      return [r.lessonTitle, course ? course.title : r.courseId, r.rosterN, r.pctCompleted + '%', r.pctInProgress + '%', r.pctNotStarted + '%'];
    })
  ];
  
  const csvContent = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `learning-executive-report-${date}-${practiceLabel}-${statusLabel}.csv`;
  link.click();
  showToast('Executive report exported', 'success');
}

/**
 * Render user summary cards
 */
function renderUserCards() {
  const container = document.getElementById('userCards');
  
  if (!container) {
    console.error('userCards container not found');
    return;
  }
  
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
function renderDataTable(courseFilter = '', lessonFilter = '', statusFilter = '', searchFilter = '') {
  const tbody = document.getElementById('tableBody');
  
  if (!tbody) {
    console.error('tableBody not found');
    return;
  }
  
  const rows = [];
  
  filteredData.forEach(user => {
    adminData.lessons.forEach(lesson => {
      // Apply course filter
      if (courseFilter && lesson.courseId !== courseFilter) {
        return;
      }
      
      // Apply lesson filter
      if (lessonFilter && lesson.id !== lessonFilter) {
        return;
      }
      
      const progress = user.progress[lesson.id] || {};
      const status = progress.completed ? 'completed' : (progress.clicked ? 'clicked' : 'not-started');
      const statusText = progress.completed ? 'Completed' : (progress.clicked ? 'In Progress' : 'Not Started');
      
      rows.push({
        userName: user.name,
        userEmail: user.email || '',
        lessonTitle: lesson.title,
        lessonId: lesson.id,
        courseId: lesson.courseId,
        status,
        statusText,
        clickedAt: progress.clicked || null,
        completedAt: progress.completed || null
      });
    });
  });
  
  // Apply status filter
  let filteredRows = statusFilter 
    ? rows.filter(r => r.status === statusFilter)
    : rows;
  
  // Apply search filter to table rows
  if (searchFilter) {
    filteredRows = filteredRows.filter(row => {
      const userName = row.userName?.toLowerCase() || '';
      const userEmail = row.userEmail?.toLowerCase() || '';
      const lessonTitle = row.lessonTitle?.toLowerCase() || '';
      return userName.includes(searchFilter) || 
             userEmail.includes(searchFilter) || 
             lessonTitle.includes(searchFilter);
    });
  }
  
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
  document.getElementById('courseFilter').addEventListener('change', handleFilterChange);
  document.getElementById('lessonFilter').addEventListener('change', handleFilterChange);
  document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
  document.getElementById('searchFilter').addEventListener('input', handleFilterChange);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  
  const rosterStatusFilter = document.getElementById('rosterStatusFilter');
  const rosterPracticeFilter = document.getElementById('rosterPracticeFilter');
  if (rosterStatusFilter) rosterStatusFilter.addEventListener('change', () => { computeExecutiveReport(); renderExecutiveReport(); });
  if (rosterPracticeFilter) rosterPracticeFilter.addEventListener('change', () => { computeExecutiveReport(); renderExecutiveReport(); });
  const exportExec = document.getElementById('exportExecutiveBtn');
  if (exportExec) exportExec.addEventListener('click', exportExecutiveReport);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
  const userFilter = document.getElementById('userFilter').value;
  const courseFilter = document.getElementById('courseFilter')?.value || '';
  const lessonFilter = document.getElementById('lessonFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter').value;
  const searchFilter = document.getElementById('searchFilter')?.value.toLowerCase() || '';
  
  // Filter users
  if (userFilter) {
    filteredData = adminData.users.filter(u => u.id === userFilter);
  } else {
    filteredData = [...adminData.users];
  }
  
  // Apply search filter
  if (searchFilter) {
    filteredData = filteredData.filter(user => {
      const userName = user.name?.toLowerCase() || '';
      const userEmail = user.email?.toLowerCase() || '';
      return userName.includes(searchFilter) || userEmail.includes(searchFilter);
    });
  }
  
  renderUserCards();
  renderDataTable(courseFilter, lessonFilter, statusFilter, searchFilter);
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
