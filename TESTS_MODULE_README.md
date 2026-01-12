# Tests Module - User Dashboard

## Overview
New module added to allow students to view and take tests created by admins.

## Files Created

### 1. `/app/dashboard/tests/page.js`
- **Purpose**: Lists all active tests created by admins
- **Features**:
  - Displays test cards with title, duration, sections (Math/R&W)
  - Shows test configuration type (Standard/Custom)
  - "Start Test" button for each test
  - Filters only active tests
  - Responsive grid layout

### 2. `/app/dashboard/tests/[id]/start/page.js`
- **Purpose**: Test-taking interface
- **Features**:
  - **Timer**: Countdown timer with auto-submit when time expires
  - **Question Display**: Shows one question at a time with 4 options (A, B, C, D)
  - **Answer Selection**: Click to select answers, highlighted when selected
  - **Navigation**: Previous/Next buttons to move between questions
  - **Question Navigator**: Grid showing all questions with status:
    - Blue: Current question
    - Green: Answered questions
    - Gray: Unanswered questions
  - **Progress Tracker**: Shows "X of Y answered"
  - **Submit Button**: Manual submit option
  - **Results Screen**: Shows score percentage and correct/total count
  - **Auto-save**: Saves test session to database on completion

## Navigation Updates

### DashboardLayout.js
- Added "Tests" menu item with target icon
- Positioned second in the navigation menu

### Dashboard Home (page.js)
- Updated "Create Practice Test" button to "Take a Test"
- Links to `/dashboard/tests`

## User Flow

1. **Student clicks "Tests" in sidebar** → Goes to tests listing page
2. **Student clicks "Start Test"** → Test interface loads with timer
3. **Student answers questions** → Can navigate freely between questions
4. **Student clicks "Submit Test"** or **Timer expires** → Test auto-submits
5. **Results displayed** → Shows score and navigation options
6. **Test session saved** → Stored in database for analytics

## Features

✅ View all active tests created by admins
✅ Real-time countdown timer
✅ Question-by-question navigation
✅ Visual progress tracking
✅ Answer selection with highlighting
✅ Auto-submit on time expiration
✅ Instant score calculation
✅ Test session persistence
✅ Responsive design
✅ Mobile-friendly interface

## API Endpoints Used

- `GET /api/admin/tests` - Fetch all tests
- `GET /api/admin/tests/:id` - Fetch specific test details
- `GET /api/questions` - Fetch questions for the test
- `POST /api/test-sessions` - Save completed test session

## Next Steps (Optional Enhancements)

- Add test history/results page
- Show detailed answer review after submission
- Add pause/resume functionality
- Implement section-wise timing
- Add bookmarking questions during test
- Show explanations for incorrect answers
