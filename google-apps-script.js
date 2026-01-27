/**
 * Google Apps Script - Learning Tracker Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet with 3 tabs: "Users", "Events", "Lessons"
 * 2. Set up headers in each sheet:
 *    - Users: user_id | email | name | created_at
 *    - Events: event_id | user_id | lesson_id | event_type | timestamp
 *    - Lessons: lesson_id | title | description | category | order | links
 * 3. Add your lessons to the Lessons sheet
 *    - For links column, use JSON format: [{"title":"Link Name","url":"https://..."},{"title":"Another","url":"https://..."}]
 * 4. Go to Extensions > Apps Script
 * 5. Delete any existing code and paste this entire file
 * 6. Click Deploy > New deployment
 * 7. Select "Web app"
 * 8. Set "Execute as" to "Me"
 * 9. Set "Who has access" to "Anyone"
 * 10. Click Deploy and authorize the app
 * 11. Copy the Web App URL and paste it into js/api.js
 */

// ============================================
// Configuration - UPDATE THIS
// ============================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Get this from the URL of your Google Sheet

// Sheet names
const USERS_SHEET = 'Users';
const EVENTS_SHEET = 'Events';
const COURSES_SHEET = 'Courses';
const LESSONS_SHEET = 'Lessons';

// ============================================
// Web App Entry Points
// ============================================

/**
 * Handle GET requests (fetching data)
 */
function doGet(e) {
  // Handle missing parameters
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || 'getLessons';
  
  let result;
  
  switch (action) {
    case 'getCourses':
      result = getCourses();
      break;
    case 'getLessons':
      result = getLessons();
      break;
    case 'getUserProgress':
      result = getUserProgress(params.userId);
      break;
    case 'getAdminData':
      result = getAdminData();
      break;
    case 'findUserByEmail':
      result = findUserByEmail(params.email);
      break;
    default:
      result = getLessons();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests (tracking events)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch (action) {
      case 'registerUser':
        result = registerUser(data);
        break;
      case 'trackEvent':
        result = trackEvent(data);
        break;
      default:
        result = { error: 'Unknown action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// Data Functions
// ============================================

/**
 * Get all courses
 */
function getCourses() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(COURSES_SHEET);
  if (!sheet) return { courses: [] };
  
  const data = sheet.getDataRange().getValues();
  
  const courses = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Has course_id
      courses.push({
        id: row[0],
        title: row[1],
        description: row[2],
        order: row[3] || i
      });
    }
  }
  
  // Sort by order
  courses.sort((a, b) => a.order - b.order);
  
  return { courses };
}

/**
 * Get all lessons
 */
function getLessons() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LESSONS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const lessons = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Has lesson_id
      // Parse links from JSON string (now in column 7, index 6)
      let links = [];
      if (row[6]) {
        try {
          links = JSON.parse(row[6]);
        } catch (e) {
          // If not valid JSON, try to parse as simple URL
          links = [{ title: 'View Resource', url: row[6] }];
        }
      }
      
      lessons.push({
        id: row[0],
        courseId: row[1],
        title: row[2],
        description: row[3],
        category: row[4],
        order: row[5] || i,
        links: links
      });
    }
  }
  
  // Sort by order
  lessons.sort((a, b) => a.order - b.order);
  
  return { lessons };
}

/**
 * Get user's progress (events)
 */
function getUserProgress(userId) {
  if (!userId) return { events: [] };
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EVENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const events = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === userId) { // user_id matches
      events.push({
        eventId: row[0],
        userId: row[1],
        lessonId: row[2],
        eventType: row[3],
        timestamp: row[4]
      });
    }
  }
  
  return { events };
}

/**
 * Find user by email address
 */
function findUserByEmail(email) {
  if (!email) return { user: null };
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const emailLower = email.toLowerCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] && row[1].toString().toLowerCase().trim() === emailLower) {
      return {
        user: {
          id: row[0],
          email: row[1],
          name: row[2],
          createdAt: row[3]
        }
      };
    }
  }
  
  return { user: null };
}

/**
 * Get all data for admin dashboard
 */
function getAdminData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get users
  const usersSheet = ss.getSheetByName(USERS_SHEET);
  const usersData = usersSheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    if (row[0]) {
      users.push({
        id: row[0],
        email: row[1],
        name: row[2],
        createdAt: row[3]
      });
    }
  }
  
  // Get events
  const eventsSheet = ss.getSheetByName(EVENTS_SHEET);
  const eventsData = eventsSheet.getDataRange().getValues();
  const events = [];
  for (let i = 1; i < eventsData.length; i++) {
    const row = eventsData[i];
    if (row[0]) {
      events.push({
        eventId: row[0],
        userId: row[1],
        lessonId: row[2],
        eventType: row[3],
        timestamp: row[4]
      });
    }
  }
  
  // Get lessons
  const lessonsResult = getLessons();
  
  return {
    users,
    events,
    lessons: lessonsResult.lessons
  };
}

/**
 * Register a new user
 */
function registerUser(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  
  // Check if user already exists by email
  const existingData = sheet.getDataRange().getValues();
  const emailLower = data.email ? data.email.toLowerCase().trim() : '';
  
  for (let i = 1; i < existingData.length; i++) {
    // Check by user ID or email
    if (existingData[i][0] === data.userId || 
        (emailLower && existingData[i][1] && existingData[i][1].toString().toLowerCase().trim() === emailLower)) {
      return { success: true, message: 'User already exists', userId: existingData[i][0] };
    }
  }
  
  // Add new user
  sheet.appendRow([
    data.userId,
    data.email || '',
    data.name,
    data.createdAt || new Date().toISOString()
  ]);
  
  return { success: true, userId: data.userId };
}

/**
 * Track a user event (click or complete)
 */
function trackEvent(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EVENTS_SHEET);
  
  // Generate event ID
  const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Add event
  sheet.appendRow([
    eventId,
    data.userId,
    data.lessonId,
    data.eventType,
    data.timestamp || new Date().toISOString()
  ]);
  
  return { success: true, eventId };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Initialize the spreadsheet with headers (run once)
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Users sheet
  let usersSheet = ss.getSheetByName(USERS_SHEET);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(USERS_SHEET);
  }
  usersSheet.getRange(1, 1, 1, 4).setValues([['user_id', 'email', 'name', 'created_at']]);
  
  // Events sheet
  let eventsSheet = ss.getSheetByName(EVENTS_SHEET);
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet(EVENTS_SHEET);
  }
  eventsSheet.getRange(1, 1, 1, 5).setValues([['event_id', 'user_id', 'lesson_id', 'event_type', 'timestamp']]);
  
  // Courses sheet
  let coursesSheet = ss.getSheetByName(COURSES_SHEET);
  if (!coursesSheet) {
    coursesSheet = ss.insertSheet(COURSES_SHEET);
  }
  coursesSheet.getRange(1, 1, 1, 4).setValues([['course_id', 'title', 'description', 'order']]);
  
  // Add sample courses
  coursesSheet.getRange(2, 1, 2, 4).setValues([
    ['course-1', 'Getting Started', 'Begin your learning journey with the fundamentals.', 1],
    ['course-2', 'Advanced Topics', 'Take your skills to the next level.', 2]
  ]);
  
  // Lessons sheet
  let lessonsSheet = ss.getSheetByName(LESSONS_SHEET);
  if (!lessonsSheet) {
    lessonsSheet = ss.insertSheet(LESSONS_SHEET);
  }
  lessonsSheet.getRange(1, 1, 1, 7).setValues([['lesson_id', 'course_id', 'title', 'description', 'category', 'order', 'links']]);
  
  // Add sample lessons with links
  lessonsSheet.getRange(2, 1, 3, 7).setValues([
    ['lesson-1', 'course-1', 'Introduction to Modern Development', 'Learn the fundamentals of modern software development practices.', 'Fundamentals', 1, '[{"title":"Video: Getting Started","url":"https://www.youtube.com/watch?v=example1"}]'],
    ['lesson-2', 'course-1', 'Building Scalable Applications', 'Discover patterns and techniques for building scalable apps.', 'Architecture', 2, '[{"title":"Guide: Best Practices","url":"https://docs.example.com/guide"}]'],
    ['lesson-3', 'course-2', 'Advanced Design Patterns', 'Deep dive into software design patterns.', 'Patterns', 1, '[{"title":"Patterns Guide","url":"https://docs.example.com/patterns"}]']
  ]);
  
  Logger.log('Spreadsheet initialized successfully!');
}

/**
 * Test function - run this to verify setup
 */
function testSetup() {
  const lessons = getLessons();
  Logger.log('Lessons: ' + JSON.stringify(lessons));
  
  const adminData = getAdminData();
  Logger.log('Admin Data: ' + JSON.stringify(adminData));
}
