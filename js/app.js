/**
 * Learning Tracker - Main Application
 */

// ============================================
// State Management
// ============================================
let currentUser = null;
let courses = [];
let lessons = [];
let userProgress = {}; // { lessonId: { clicked: timestamp, completed: timestamp } }
let currentLessonId = null; // Currently viewed lesson in modal
let currentCourseId = null; // Currently selected course

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check for existing user
  const savedUser = localStorage.getItem('learningTrackerUser');
  
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    await initializeApp();
  } else {
    showNameModal();
  }
});

/**
 * Initialize the application after user is set
 */
async function initializeApp() {
  updateHeaderUser();
  showLoading();
  
  try {
    // Load courses and lessons
    if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
      courses = await window.LearningAPI.getCourses();
      lessons = await window.LearningAPI.getLessons();
      const progressData = await window.LearningAPI.getUserProgress(currentUser.id);
      processProgressData(progressData.events || []);
    } else {
      // Use default data if API not configured
      courses = window.LearningAPI ? window.LearningAPI.getDefaultCourses() : getDefaultCoursesLocal();
      lessons = window.LearningAPI ? window.LearningAPI.getDefaultLessons() : getDefaultLessonsLocal();
      loadLocalProgress();
    }
    
    console.log('=== LEARNING TRACKER DEBUG ===');
    console.log('Loaded courses:', courses);
    console.log('Loaded lessons:', lessons);
    console.log('Courses count:', courses.length);
    console.log('Lessons count:', lessons.length);
    
    // If no courses but we have lessons, try to infer courses from lessons
    if (courses.length === 0 && lessons.length > 0) {
      console.warn('No courses found, but lessons exist. Extracting courses from lessons...');
      const uniqueCourseIds = [...new Set(lessons.map(l => l.courseId).filter(Boolean))];
      courses = uniqueCourseIds.map((courseId, idx) => ({
        id: courseId,
        title: `Course ${idx + 1}`,
        description: '',
        order: idx + 1
      }));
      console.log('Inferred courses:', courses);
    }
    
    // Set initial course
    if (courses.length > 0 && !currentCourseId) {
      currentCourseId = courses[0].id;
      console.log('Set initial course:', currentCourseId);
    }
    
    renderCourseTabs();
    renderCourseHeader();
    renderLessons();
    updateProgressOverview();
    console.log('=== END DEBUG ===');
  } catch (error) {
    console.error('Error initializing app:', error);
    courses = getDefaultCoursesLocal();
    lessons = getDefaultLessonsLocal();
    if (courses.length > 0) currentCourseId = courses[0].id;
    renderCourseTabs();
    renderCourseHeader();
    renderLessons();
  }
}

/**
 * Process progress data from API
 */
function processProgressData(events) {
  userProgress = {};
  events.forEach(event => {
    if (!userProgress[event.lessonId]) {
      userProgress[event.lessonId] = {};
    }
    userProgress[event.lessonId][event.eventType] = event.timestamp;
  });
}

/**
 * Load progress from localStorage (fallback)
 */
function loadLocalProgress() {
  const saved = localStorage.getItem(`progress_${currentUser.id}`);
  if (saved) {
    userProgress = JSON.parse(saved);
  }
}

/**
 * Save progress to localStorage (fallback)
 */
function saveLocalProgress() {
  localStorage.setItem(`progress_${currentUser.id}`, JSON.stringify(userProgress));
}

// ============================================
// UI Rendering
// ============================================

/**
 * Show loading state
 */
function showLoading() {
  const grid = document.getElementById('lessonsGrid');
  grid.innerHTML = `
    <div class="loading" style="grid-column: 1 / -1;">
      <div class="loading-spinner"></div>
    </div>
  `;
}

/**
 * Render course tabs
 */
function renderCourseTabs() {
  const tabsContainer = document.getElementById('courseTabs');
  
  if (!tabsContainer) {
    console.error('❌ Course tabs container not found in DOM!');
    return;
  }
  
  console.log(`🎯 renderCourseTabs called with ${courses.length} courses`);
  
  if (courses.length === 0) {
    console.warn('⚠️ No courses to display - hiding tabs');
    tabsContainer.style.display = 'none';
    tabsContainer.innerHTML = '';
    return;
  }
  
  console.log(`✅ Rendering ${courses.length} course tabs`);
  
  tabsContainer.style.display = 'flex';
  const tabsHTML = courses.map(course => {
    const courseLessons = lessons.filter(l => l.courseId === course.id);
    const completedCount = courseLessons.filter(l => userProgress[l.id]?.completed).length;
    const isComplete = courseLessons.length > 0 && completedCount === courseLessons.length;
    const isActive = course.id === currentCourseId;
    
    console.log(`  - Course: ${course.title} (${course.id}), Lessons: ${courseLessons.length}, Active: ${isActive}`);
    
    return `
      <button class="course-tab ${isActive ? 'active' : ''} ${isComplete ? 'completed' : ''}" 
              data-course-id="${course.id}"
              onclick="selectCourse('${course.id}')">
        ${escapeHtml(course.title)}
        <span class="course-tab-progress">${completedCount}/${courseLessons.length}</span>
      </button>
    `;
  }).join('');
  
  tabsContainer.innerHTML = tabsHTML;
  console.log('✅ Tabs HTML rendered, container display:', window.getComputedStyle(tabsContainer).display);
}

/**
 * Render course header info
 */
function renderCourseHeader() {
  const course = courses.find(c => c.id === currentCourseId);
  const headerEl = document.getElementById('courseHeader');
  
  if (!course) {
    headerEl.style.display = 'none';
    return;
  }
  
  headerEl.style.display = 'flex';
  
  const courseLessons = lessons.filter(l => l.courseId === course.id);
  const completedCount = courseLessons.filter(l => userProgress[l.id]?.completed).length;
  const percentage = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  
  document.getElementById('courseTitle').textContent = course.title;
  document.getElementById('courseDescription').textContent = course.description || '';
  document.getElementById('courseProgressText').textContent = `${completedCount}/${courseLessons.length} complete`;
  document.getElementById('courseProgressFill').style.width = `${percentage}%`;
}

/**
 * Select a course (switch tabs)
 */
function selectCourse(courseId) {
  currentCourseId = courseId;
  renderCourseTabs();
  renderCourseHeader();
  renderLessons();
}

/**
 * Render all lesson cards for the current course
 */
function renderLessons() {
  const grid = document.getElementById('lessonsGrid');
  
  // Filter lessons by current course
  const courseLessons = currentCourseId 
    ? lessons.filter(l => l.courseId === currentCourseId)
    : lessons;
  
  if (courseLessons.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>No lessons available in this course yet.</p>
      </div>
    `;
    return;
  }
  
  // Sort by order
  courseLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  grid.innerHTML = courseLessons.map(lesson => renderLessonCard(lesson)).join('');
  
  // Add click handlers
  document.querySelectorAll('.lesson-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger card click if clicking the complete button
      if (e.target.closest('.btn-complete')) return;
      handleCardClick(card.dataset.lessonId);
    });
  });
  
  document.querySelectorAll('.btn-complete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleComplete(btn.dataset.lessonId);
    });
  });
}

/**
 * Render a single lesson card
 */
function renderLessonCard(lesson) {
  const progress = userProgress[lesson.id] || {};
  const status = getStatus(progress);
  const statusClass = status.toLowerCase().replace(' ', '-');
  
  let cardClass = 'lesson-card';
  if (progress.completed) cardClass += ' completed';
  else if (progress.clicked) cardClass += ' clicked';
  
  return `
    <div class="${cardClass}" data-lesson-id="${lesson.id}">
      <div class="card-header">
        <span class="card-category">${escapeHtml(lesson.category)}</span>
        <span class="card-status ${statusClass}">
          ${getStatusIcon(status)}
          ${status}
        </span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(lesson.title)}</h3>
        <p class="card-description">${escapeHtml(lesson.description)}</p>
      </div>
      <div class="card-footer">
        <span class="card-meta">${progress.clicked ? 'Started ' + formatDate(progress.clicked) : 'Not started'}</span>
        <button class="btn-complete ${progress.completed ? 'is-completed' : ''}" 
                data-lesson-id="${lesson.id}"
                ${progress.completed ? 'disabled' : ''}>
          ${progress.completed ? '✓ Completed' : 'Mark Complete'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Get status text based on progress
 */
function getStatus(progress) {
  if (progress.completed) return 'Completed';
  if (progress.clicked) return 'In Progress';
  return 'Not Started';
}

/**
 * Get status icon SVG
 */
function getStatusIcon(status) {
  switch (status) {
    case 'Completed':
      return '<svg class="status-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
    case 'In Progress':
      return '<svg class="status-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>';
    default:
      return '<svg class="status-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"/></svg>';
  }
}

/**
 * Update the header with user info
 */
function updateHeaderUser() {
  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay && currentUser) {
    userDisplay.textContent = currentUser.name;
  }
}

/**
 * Update progress overview stats
 */
function updateProgressOverview() {
  const total = lessons.length;
  const completed = lessons.filter(l => userProgress[l.id]?.completed).length;
  const inProgress = lessons.filter(l => userProgress[l.id]?.clicked && !userProgress[l.id]?.completed).length;
  const notStarted = total - completed - inProgress;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Update stats
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('inProgressCount').textContent = inProgress;
  document.getElementById('notStartedCount').textContent = notStarted;
  document.getElementById('progressPercent').textContent = `${percentage}%`;
  
  // Update progress bar
  document.getElementById('progressFill').style.width = `${percentage}%`;
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle card click - open lesson detail modal
 */
async function handleCardClick(lessonId) {
  // Mark as clicked if not already
  if (!userProgress[lessonId]) {
    userProgress[lessonId] = {};
  }
  
  if (!userProgress[lessonId].clicked) {
    userProgress[lessonId].clicked = new Date().toISOString();
    
    // Track event
    if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
      await window.LearningAPI.trackEvent(currentUser.id, lessonId, 'clicked');
    }
    saveLocalProgress();
    
    renderLessons();
    updateProgressOverview();
  }
  
  // Open the lesson modal
  openLessonModal(lessonId);
}

/**
 * Open the lesson detail modal
 */
function openLessonModal(lessonId) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return;
  
  currentLessonId = lessonId;
  const progress = userProgress[lessonId] || {};
  
  // Populate modal content
  document.getElementById('modalCategory').textContent = lesson.category || 'Lesson';
  document.getElementById('modalTitle').textContent = lesson.title;
  document.getElementById('modalDescription').textContent = lesson.description;
  
  // Render links
  const linksContainer = document.getElementById('modalLinks');
  const links = lesson.links || [];
  
  if (links.length > 0) {
    linksContainer.innerHTML = links.map(link => `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="modal-link">
        <div class="modal-link-icon">
          ${getLinkIcon(link.url)}
        </div>
        <div class="modal-link-content">
          <div class="modal-link-title">${escapeHtml(link.title || 'View Resource')}</div>
          <div class="modal-link-url">${escapeHtml(truncateUrl(link.url))}</div>
        </div>
        <svg class="modal-link-arrow" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </a>
    `).join('');
  } else {
    linksContainer.innerHTML = '<div class="no-links-message">No resources available for this lesson yet.</div>';
  }
  
  // Update complete button state
  const completeBtn = document.getElementById('modalCompleteBtn');
  if (progress.completed) {
    completeBtn.textContent = '✓ Completed';
    completeBtn.classList.add('is-completed');
    completeBtn.disabled = true;
  } else {
    completeBtn.textContent = 'Mark Complete';
    completeBtn.classList.remove('is-completed');
    completeBtn.disabled = false;
  }
  
  // Show modal
  const modal = document.getElementById('lessonModal');
  modal.classList.add('active');
  
  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeLessonModal();
    }
  };
  
  // Close on Escape key
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close the lesson detail modal
 */
function closeLessonModal() {
  const modal = document.getElementById('lessonModal');
  modal.classList.remove('active');
  currentLessonId = null;
  document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Handle Escape key to close modal
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeLessonModal();
  }
}

/**
 * Handle completion from modal
 */
async function handleModalComplete() {
  if (currentLessonId) {
    await handleComplete(currentLessonId);
    
    // Update modal button
    const completeBtn = document.getElementById('modalCompleteBtn');
    completeBtn.textContent = '✓ Completed';
    completeBtn.classList.add('is-completed');
    completeBtn.disabled = true;
  }
}

/**
 * Get appropriate icon for link type
 */
function getLinkIcon(url) {
  const urlLower = url.toLowerCase();
  
  // Video platforms
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
    return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>';
  }
  
  // Documents
  if (urlLower.includes('.pdf') || urlLower.includes('docs.google.com') || urlLower.includes('notion.')) {
    return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>';
  }
  
  // GitHub
  if (urlLower.includes('github.com')) {
    return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" clip-rule="evenodd"/></svg>';
  }
  
  // Default link icon
  return '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"/></svg>';
}

/**
 * Truncate URL for display
 */
function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch {
    return url.substring(0, 40) + (url.length > 40 ? '...' : '');
  }
}

/**
 * Handle completion button click
 */
async function handleComplete(lessonId) {
  if (!userProgress[lessonId]) {
    userProgress[lessonId] = {};
  }
  
  if (!userProgress[lessonId].completed) {
    // Also mark as clicked if not already
    if (!userProgress[lessonId].clicked) {
      userProgress[lessonId].clicked = new Date().toISOString();
      if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
        await window.LearningAPI.trackEvent(currentUser.id, lessonId, 'clicked');
      }
    }
    
    userProgress[lessonId].completed = new Date().toISOString();
    
    // Track event
    if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
      await window.LearningAPI.trackEvent(currentUser.id, lessonId, 'completed');
    }
    saveLocalProgress();
    
    renderLessons();
    renderCourseTabs(); // Update tab progress
    renderCourseHeader(); // Update course progress
    updateProgressOverview();
    showToast('Lesson completed! Great work!', 'success');
  }
}

/**
 * Handle user logout/switch
 */
function handleLogout() {
  localStorage.removeItem('learningTrackerUser');
  currentUser = null;
  userProgress = {};
  showNameModal();
}

// ============================================
// Modal Functions
// ============================================

/**
 * Show the login modal
 */
function showNameModal() {
  const modal = document.getElementById('nameModal');
  modal.classList.add('active');
  document.getElementById('emailInput').focus();
  // Reset form state
  document.getElementById('loginHint').textContent = '';
  document.getElementById('loginBtn').textContent = 'Continue';
  document.getElementById('loginBtn').disabled = false;
}

/**
 * Hide the name modal
 */
function hideNameModal() {
  const modal = document.getElementById('nameModal');
  modal.classList.remove('active');
}

/**
 * Handle login form submission
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  const emailInput = document.getElementById('emailInput');
  const nameInput = document.getElementById('nameInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginHint = document.getElementById('loginHint');
  
  const email = emailInput.value.trim().toLowerCase();
  const name = nameInput.value.trim();
  
  if (!email) {
    emailInput.focus();
    return;
  }
  
  // Disable button while checking
  loginBtn.disabled = true;
  loginBtn.textContent = 'Checking...';
  loginHint.textContent = '';
  
  try {
    // Check if user exists by email
    let existingUser = null;
    if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
      existingUser = await window.LearningAPI.findUserByEmail(email);
    }
    
    if (existingUser) {
      // Existing user found - restore their session
      currentUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name
      };
      localStorage.setItem('learningTrackerUser', JSON.stringify(currentUser));
      
      hideNameModal();
      await initializeApp();
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
    } else {
      // New user - need a name
      if (!name) {
        loginHint.textContent = 'Looks like you\'re new! Please enter your name.';
        loginHint.className = 'modal-hint info';
        nameInput.focus();
        nameInput.required = true;
        loginBtn.disabled = false;
        loginBtn.textContent = 'Get Started';
        return;
      }
      
      // Create new user
      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      currentUser = { id: userId, email: email, name: name };
      
      // Save locally
      localStorage.setItem('learningTrackerUser', JSON.stringify(currentUser));
      
      // Register with API
      if (window.LearningAPI && window.LearningAPI.isApiConfigured()) {
        await window.LearningAPI.registerUser(userId, email, name);
      }
      
      hideNameModal();
      await initializeApp();
      showToast(`Welcome, ${name}!`, 'success');
    }
  } catch (error) {
    console.error('Login error:', error);
    // Fallback: create local user
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    currentUser = { id: userId, email: email, name: name || email.split('@')[0] };
    localStorage.setItem('learningTrackerUser', JSON.stringify(currentUser));
    
    hideNameModal();
    await initializeApp();
    showToast(`Welcome, ${currentUser.name}!`, 'success');
  }
  
  loginBtn.disabled = false;
  loginBtn.textContent = 'Continue';
}

// ============================================
// Utility Functions
// ============================================

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
 * Format date for display
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Default courses (local fallback)
 */
function getDefaultCoursesLocal() {
  return [
    {
      id: 'course-1',
      title: 'Getting Started',
      description: 'Begin your learning journey with the fundamentals. This course covers the essential concepts you need to know.',
      order: 1
    },
    {
      id: 'course-2',
      title: 'Advanced Topics',
      description: 'Take your skills to the next level with advanced patterns and best practices.',
      order: 2
    }
  ];
}

/**
 * Default lessons (local fallback)
 */
function getDefaultLessonsLocal() {
  return [
    {
      id: 'lesson-1',
      courseId: 'course-1',
      title: 'Introduction to Modern Development',
      description: 'Learn the fundamentals of modern software development practices, including agile methodologies and best practices. This lesson covers key concepts like version control, continuous integration, and collaborative development workflows that are essential for any modern development team.',
      category: 'Fundamentals',
      order: 1,
      links: [
        { title: 'Video: Getting Started with Git', url: 'https://www.youtube.com/watch?v=example1' },
        { title: 'Documentation: Agile Principles', url: 'https://docs.example.com/agile' }
      ]
    },
    {
      id: 'lesson-2',
      courseId: 'course-1',
      title: 'Building Scalable Applications',
      description: 'Discover patterns and techniques for building applications that scale effectively with growing user demands. Learn about microservices architecture, load balancing, caching strategies, and database optimization techniques used by top tech companies.',
      category: 'Architecture',
      order: 2,
      links: [
        { title: 'Guide: Microservices Best Practices', url: 'https://docs.example.com/microservices' },
        { title: 'GitHub: Example Architecture', url: 'https://github.com/example/scalable-app' },
        { title: 'Video: Scaling 101', url: 'https://www.youtube.com/watch?v=example2' }
      ]
    },
    {
      id: 'lesson-3',
      courseId: 'course-2',
      title: 'Advanced Design Patterns',
      description: 'Deep dive into software design patterns that help you write maintainable, flexible, and scalable code.',
      category: 'Patterns',
      order: 1,
      links: [
        { title: 'Design Patterns Guide', url: 'https://docs.example.com/patterns' }
      ]
    }
  ];
}

// Expose functions globally
window.handleLogout = handleLogout;
window.closeLessonModal = closeLessonModal;
window.handleModalComplete = handleModalComplete;
window.selectCourse = selectCourse;
