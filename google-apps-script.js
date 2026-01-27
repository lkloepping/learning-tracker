/**
 * Google Apps Script - Learning Tracker Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet with 3 tabs: "Users", "Events", "Lessons"
 * 2. Set up headers in each sheet:
 *    - Users: user_id | name | created_at
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
const LESSONS_SHEET = 'Lessons';

// ============================================
// Web App Entry Points
// ============================================

/**
 * Handle GET requests (fetching data)
 */
function doGet(e) {
  const action = e.parameter.action;
  
  let result;
  
  switch (action) {
    case 'getLessons':
      result = getLessons();
      break;
    case 'getUserProgress':
      result = getUserProgress(e.parameter.userId);
      break;
    case 'getAdminData':
      result = getAdminData();
      break;
    default:
      result = { error: 'Unknown action' };
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
      // Parse links from JSON string
      let links = [];
      if (row[5]) {
        try {
          links = JSON.parse(row[5]);
        } catch (e) {
          // If not valid JSON, try to parse as simple URL
          links = [{ title: 'View Resource', url: row[5] }];
        }
      }
      
      lessons.push({
        id: row[0],
        title: row[1],
        description: row[2],
        category: row[3],
        order: row[4] || i,
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
        name: row[1],
        createdAt: row[2]
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
  
  // Check if user already exists
  const existingData = sheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0] === data.userId) {
      return { success: true, message: 'User already exists' };
    }
  }
  
  // Add new user
  sheet.appendRow([
    data.userId,
    data.name,
    data.createdAt || new Date().toISOString()
  ]);
  
  return { success: true };
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
  usersSheet.getRange(1, 1, 1, 3).setValues([['user_id', 'name', 'created_at']]);
  
  // Events sheet
  let eventsSheet = ss.getSheetByName(EVENTS_SHEET);
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet(EVENTS_SHEET);
  }
  eventsSheet.getRange(1, 1, 1, 5).setValues([['event_id', 'user_id', 'lesson_id', 'event_type', 'timestamp']]);
  
  // Lessons sheet
  let lessonsSheet = ss.getSheetByName(LESSONS_SHEET);
  if (!lessonsSheet) {
    lessonsSheet = ss.insertSheet(LESSONS_SHEET);
  }
  lessonsSheet.getRange(1, 1, 1, 6).setValues([['lesson_id', 'title', 'description', 'category', 'order', 'links']]);
  
  // Add sample lessons with links
  lessonsSheet.getRange(2, 1, 2, 6).setValues([
    ['lesson-1', 'Introduction to Modern Development', 'Learn the fundamentals of modern software development practices, including agile methodologies and best practices. This lesson covers key concepts like version control, continuous integration, and collaborative development workflows.', 'Fundamentals', 1, '[{"title":"Video: Getting Started with Git","url":"https://www.youtube.com/watch?v=example1"},{"title":"Documentation: Agile Principles","url":"https://docs.example.com/agile"}]'],
    ['lesson-2', 'Building Scalable Applications', 'Discover patterns and techniques for building applications that scale effectively with growing user demands. Learn about microservices architecture, load balancing, and caching strategies.', 'Architecture', 2, '[{"title":"Guide: Microservices Best Practices","url":"https://docs.example.com/microservices"},{"title":"GitHub: Example Architecture","url":"https://github.com/example/scalable-app"}]']
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
