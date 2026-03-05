# Bulk Question Upload with Preview & Approval Feature

## Overview
This feature adds a preview and approval workflow for bulk question uploads, allowing admins to review, edit, and approve questions before they are saved to the database.

## How It Works

### 1. Upload CSV/Excel File
- Navigate to: `http://localhost:3000/admin/sat-question-upload?mode=bulk&subject=Math`
- Select your question bank destination
- Upload CSV or Excel file with questions
- Optionally upload images (embedded or as separate files)

### 2. Preview Questions
- After file upload, all questions are parsed and displayed in a preview modal
- Each question shows:
  - Subject and difficulty badges
  - Image indicator if images are present
  - Question content with embedded images
  - All answer options (A, B, C, D)
  - Correct answer highlighted in green
  - Explanation text
  - Tags

### 3. Edit Questions
- Click "Edit" button on any question to modify:
  - Subject (Math or Reading & Writing)
  - Difficulty (Easy, Medium, Hard)
  - Question content
  - Answer options
  - Correct answer
  - Explanation
- Click "Save" to save your edits

### 4. Remove Questions
- Click "Remove" button to exclude a question from the batch
- Removed questions will not be saved to the database

### 5. Approve & Save
- Review all questions in the preview
- Click "Approve & Save All" to save all questions to the database
- Questions are saved with proper formatting and images

## Features

### Image Support
- **Embedded Images**: Images embedded in Excel cells are automatically extracted and displayed
- **Placeholder Images**: Use `[filename.png]` in your CSV and upload matching image files
- **Image Preview**: All images are rendered in the preview modal

### Question Details Displayed
- Question ID (auto-generated)
- Subject and difficulty
- Full question content with formatting
- All answer options with correct answer highlighted
- Explanations (short and long)
- Tags and topics
- Row number from original file

### Edit Capabilities
- Modify any field before approval
- Change subject, difficulty, correct answer
- Edit question text and options
- Update explanations
- Remove unwanted questions

### Validation
- Questions are validated before preview
- Missing required fields are handled gracefully
- Image mapping shows matched/missing status

## API Endpoints

### POST `/api/admin/questions/bulk-preview`
Parses uploaded file and returns preview data
- **Input**: FormData with file, images, defaultSubject
- **Output**: Array of parsed questions with all details

### POST `/api/admin/questions/bulk-approve`
Saves approved questions to database
- **Input**: JSON with questions array, questionBankId, isTutor
- **Output**: Success message with count of saved questions

## Components

### `BulkQuestionPreview.js`
Modal component that displays all questions with:
- Expandable/collapsible question cards
- Edit mode for each question
- Remove functionality
- Approve/Cancel actions

### Updated `SATQuestionUpload.js`
- Integrated preview workflow
- Changed "Upload" button to "Preview Questions"
- Added preview modal trigger
- Added approval handler

## Usage Example

1. Prepare your CSV file with columns:
   - Question, Option A, Option B, Option C, Option D
   - Correct Answer, Explanation, Subject, Difficulty, Tags

2. Navigate to bulk upload page:
   ```
   http://localhost:3000/admin/sat-question-upload?mode=bulk&subject=Math
   ```

3. Select question bank and upload file

4. Review questions in preview modal:
   - Expand each question to see full details
   - Edit any fields that need correction
   - Remove questions that shouldn't be included

5. Click "Approve & Save All" to save to database

## Benefits

- **Quality Control**: Review all questions before saving
- **Error Correction**: Fix mistakes before database insertion
- **Flexibility**: Remove unwanted questions from batch
- **Transparency**: See exactly what will be saved
- **Image Verification**: Confirm images are properly linked
- **Batch Editing**: Make corrections to multiple questions efficiently
