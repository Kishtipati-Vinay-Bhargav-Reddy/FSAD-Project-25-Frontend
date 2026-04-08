# Online Assignment Submission & Grading System

A hackathon-ready full-stack app with role-based dashboards for teachers and students.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + Framer Motion
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Auth: JWT
- File Uploads: Multer

## Quick Start

### 1) Backend
```bash
cd server
npm install
```

Create a `.env` file based on [server/.env.example](server/.env.example).

```bash
npm run dev
```

### 2) Frontend
```bash
cd client
npm install
```

Create a `.env` file based on [client/.env.example](client/.env.example).

```bash
npm run dev
```

Visit `http://localhost:5173`.

## API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/assignments`
- `POST /api/assignments` (teacher only)
- `POST /api/submissions` (student only)
- `GET /api/submissions/mine` (student only)
- `GET /api/submissions/:assignmentId` (teacher only)
- `PUT /api/submissions/:id/grade` (teacher only)
- `GET /api/dashboard/student`
- `GET /api/dashboard/teacher`

## Sample Test Data
See [server/sample-data.json](server/sample-data.json) for example accounts and assignments.

## Notes
- File uploads accept PDF, DOC, or DOCX (max 10MB).
- Tokens expire in 7 days.
