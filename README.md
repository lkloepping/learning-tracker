# Learning Tracker

A beautiful, interactive learning progress tracker with Google Sheets backend for centralized data storage.

## Features

- **Lesson Cards**: Interactive cards with click tracking and completion marking
- **User Tracking**: Simple name input with persistent sessions
- **Progress Dashboard**: Visual progress bar and statistics
- **Admin Dashboard**: View all user progress, filter by user/status
- **Executive Report**: Roster-based completion % by course and lesson for monthly reporting
- **CSV Export**: One-click export of learning analytics and executive report
- **3Pillar Branding**: Uses official color palette and typography

## Quick Start (Demo Mode)

1. Open `index.html` in a web browser
2. Enter your name when prompted
3. Click on lessons to mark them as "started"
4. Click "Mark Complete" to finish lessons
5. View progress in the Admin Dashboard (`admin.html`)

**Note**: In demo mode, data is stored in your browser's localStorage. For centralized storage, set up Google Sheets integration below.

## Google Sheets Setup (Centralized Storage)

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Learning Tracker Data"
3. Create 3 sheets (tabs) at the bottom:
   - `Users`
   - `Events`  
   - `Lessons`

### Step 2: Add Headers

**Users sheet** (Row 1):
| A | B | C |
|---|---|---|
| user_id | name | created_at |

**Events sheet** (Row 1):
| A | B | C | D | E |
|---|---|---|---|---|
| event_id | user_id | lesson_id | event_type | timestamp |

**Lessons sheet** (Row 1):
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| lesson_id | title | description | category | order | links |

### Step 3: Add Your Lessons

In the **Lessons** sheet, add your lessons starting from Row 2:

| lesson_id | title | description | category | order |
|-----------|-------|-------------|----------|-------|
| lesson-1 | Introduction to Modern Development | Learn the fundamentals... | Fundamentals | 1 |
| lesson-2 | Building Scalable Applications | Discover patterns... | Architecture | 2 |

**To add more lessons later**: Just add new rows to this sheet!

### Step 4: Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Copy the entire contents of `google-apps-script.js` and paste it
4. Near the top, replace `YOUR_SPREADSHEET_ID_HERE` with your spreadsheet ID
   - Find this in your sheet's URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
5. Click **Run > initializeSpreadsheet** (one-time setup)
6. Authorize the script when prompted
7. Click **Deploy > New deployment**
8. Choose **Web app**
9. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
10. Click **Deploy**
11. Copy the **Web App URL**

### Step 5: Connect Frontend

1. Open `js/api.js`
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with the Web App URL from Step 4

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### Step 6: Host the Files

**Option A: Local/Network**
- Just open `index.html` in a browser
- Share the folder on your network

**Option B: GitHub Pages (Free)**
1. Create a GitHub repository
2. Push all files
3. Go to Settings > Pages
4. Select "main" branch
5. Your site will be at `https://yourusername.github.io/repo-name`

**Option C: Netlify/Vercel**
1. Create account at netlify.com or vercel.com
2. Connect to GitHub or drag-drop the folder
3. Get a free URL or connect your domain

## Roster Sheet (Executive Report)

For L&D monthly reporting, add a **Roster** sheet to your Google Sheet. The admin dashboard will show completion rates as **% of roster** (e.g. "50% of roster completed Course X").

**Roster sheet** (Row 1 = headers):
| email | name | status | practice |
|-------|------|--------|----------|
| person@company.com | Jane Doe | Active Employee | Product Management |
| ux@company.com | Alex Lee | Active Employee | User Experience Research |

- **email**: Must match the email learners use when logging in (used to match roster to progress).
- **name**: Display name.
- **status**: e.g. "Active Employee", "Contractor", "On Leave". Filter the report by status (e.g. Active only).
- **practice**: e.g. "Product Management", "User Experience Research". Filter the report by practice so you can see completion rates for each practice separately.

The **Executive Summary** on the admin page shows:
- **By Course**: % of roster Completed / In Progress / Not Started per course.
- **By Lesson**: Same per lesson.
- **Export Executive Report (CSV)**: One-click download for your monthly report.

## Adding New Lessons

Simply add rows to the **Lessons** sheet in Google Sheets:

| lesson_id | title | description | category | order | links |
|-----------|-------|-------------|----------|-------|-------|
| lesson-3 | New Topic | Description here... | Category | 3 | (see below) |

### Column Reference

- `lesson_id`: Unique identifier (e.g., lesson-3, intro-to-ai)
- `title`: Display title
- `description`: Full description shown in the lesson popup
- `category`: Grouping label (shown as a badge)
- `order`: Number for sorting (1, 2, 3...)
- `links`: JSON array of resource links (see format below)

### Links Format

The `links` column accepts a JSON array. Each link has a `title` and `url`:

```json
[{"title":"Watch Video","url":"https://youtube.com/..."},{"title":"Read Docs","url":"https://docs.example.com"}]
```

**Example with multiple links:**
```json
[{"title":"Video Tutorial","url":"https://www.youtube.com/watch?v=abc123"},{"title":"GitHub Repo","url":"https://github.com/example/repo"},{"title":"Documentation","url":"https://docs.example.com/guide"}]
```

**Simple single link:**
```json
[{"title":"Start Learning","url":"https://example.com/lesson"}]
```

Or just paste a URL directly and it will be displayed as "View Resource".

Changes appear immediately - no code changes needed!

## File Structure

```
/Learning Tacker/
├── index.html              # Main lesson cards page
├── admin.html              # Admin reporting dashboard
├── css/
│   └── styles.css          # 3Pillar branded styles
├── js/
│   ├── api.js              # Google Sheets API (configure URL here)
│   ├── app.js              # Main application logic
│   └── admin.js            # Admin dashboard logic
├── google-apps-script.js   # Backend code for Google Apps Script
└── README.md               # This file
```

## Brand Colors (3Pillar)

- **Charcoal Blue**: #1b242b (primary dark)
- **Bright Blue**: #80dbeb (accents, highlights)
- **Yellow**: #f7f550 (CTAs, buttons)
- **Teal**: #b1e7d9 (success states)

## Troubleshooting

**Cards not loading?**
- Check browser console for errors
- Verify Google Apps Script URL in `js/api.js`
- Make sure the script is deployed with "Anyone" access

**Data not saving?**
- Check that the spreadsheet ID is correct in the Apps Script
- Verify you authorized the script
- Check the Events sheet for new rows

**Need to reset a user?**
- Clear browser localStorage, or
- Click "Switch User" in the header
