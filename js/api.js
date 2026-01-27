/**
 * API Module - Google Sheets Integration
 * 
 * SETUP: Replace GOOGLE_SCRIPT_URL with your deployed Google Apps Script Web App URL
 */

// ============================================
// CONFIGURATION - UPDATE THIS URL
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz8GFPqrn1pqrRIWXhifpmWNTy5T6g2CfHFt8TTpJd9k2k5wyNz2K5i_GUDkkhuyUPr6g/exec';

// ============================================
// API Functions
// ============================================

/**
 * Track a user event (click or complete)
 */
async function trackEvent(userId, lessonId, eventType) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Required for Google Apps Script
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'trackEvent',
        userId: userId,
        lessonId: lessonId,
        eventType: eventType, // 'clicked' or 'completed'
        timestamp: new Date().toISOString()
      })
    });
    
    console.log(`Event tracked: ${eventType} for lesson ${lessonId}`);
    return true;
  } catch (error) {
    console.error('Error tracking event:', error);
    return false;
  }
}

/**
 * Register a new user
 */
async function registerUser(userId, email, name) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'registerUser',
        userId: userId,
        email: email,
        name: name,
        createdAt: new Date().toISOString()
      })
    });
    
    console.log(`User registered: ${name} (${email})`);
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
}

/**
 * Find existing user by email
 */
async function findUserByEmail(email) {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=findUserByEmail&email=${encodeURIComponent(email)}`);
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Get user's progress (their events)
 */
async function getUserProgress(userId) {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUserProgress&userId=${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return { events: [] };
  }
}

/**
 * Get all lessons from the Google Sheet
 */
async function getLessons() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getLessons`);
    const data = await response.json();
    return data.lessons || [];
  } catch (error) {
    console.error('Error fetching lessons:', error);
    // Return default lessons if API fails
    return getDefaultLessons();
  }
}

/**
 * Get all data for admin dashboard
 */
async function getAdminData() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAdminData`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching admin data:', error);
    return { users: [], events: [], lessons: [] };
  }
}

/**
 * Default lessons (used when Google Sheets is not configured)
 */
function getDefaultLessons() {
  return [
    {
      id: 'lesson-1',
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
      title: 'Building Scalable Applications',
      description: 'Discover patterns and techniques for building applications that scale effectively with growing user demands. Learn about microservices architecture, load balancing, caching strategies, and database optimization techniques used by top tech companies.',
      category: 'Architecture',
      order: 2,
      links: [
        { title: 'Guide: Microservices Best Practices', url: 'https://docs.example.com/microservices' },
        { title: 'GitHub: Example Architecture', url: 'https://github.com/example/scalable-app' },
        { title: 'Video: Scaling 101', url: 'https://www.youtube.com/watch?v=example2' }
      ]
    }
  ];
}

/**
 * Check if API is configured
 */
function isApiConfigured() {
  return GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
}

// Export for use in other modules
window.LearningAPI = {
  trackEvent,
  registerUser,
  findUserByEmail,
  getUserProgress,
  getLessons,
  getAdminData,
  getDefaultLessons,
  isApiConfigured
};
