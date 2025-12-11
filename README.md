# DSAT Main - Full Stack Learning Management System

Complete Next.js full-stack application with MongoDB for DSAT/PSAT preparation.

## Features

- **Frontend & Backend in One**: Single Next.js application
- **MongoDB Database**: Complete data persistence
- **Authentication**: JWT-based login/register
- **Course Management**: Create and manage courses
- **Question Bank**: Manage questions and test sessions
- **Admin Dashboard**: Complete admin panel
- **Responsive Design**: Tailwind CSS styling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
- Install MongoDB locally or use MongoDB Atlas
- Update MONGO_URI in .env.local

3. Run the application:
```bash
npm run dev
```

4. Access the application:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin

## API Endpoints

- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/courses - Get all courses
- POST /api/courses - Create course (admin)
- GET /api/questions - Get questions
- POST /api/questions - Create question (admin)
- GET /api/test-sessions - Get user test sessions
- POST /api/test-sessions - Create test session

## Database Models

- User (authentication & profiles)
- Course (course management)
- Question (question bank)
- QuestionBank (question organization)
- TestSession (test tracking)

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcryptjs
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios