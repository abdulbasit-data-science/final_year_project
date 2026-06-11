# AI-Powered Online Exam Monitoring System

A comprehensive exam proctoring solution with real-time AI monitoring for online examinations.

## Project Structure

```
fyp/
├── frontend/          # Next.js application
├── backend/           # FastAPI server
├── ai-service/        # Computer vision service
├── supabase/          # Database schema
└── CLAUDE.md          # Project specifications
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account

### 1. Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to SQL Editor and run the schema from `supabase/schema.sql`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000`

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API will run at `http://localhost:8000`

### 4. AI Service Setup (Optional)

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn src.main:app --reload --port 8001
```

## Features

### Student Portal
- View and take available exams
- Real-time webcam monitoring
- Automatic violation detection
- Timer and question navigation

### Admin Portal
- Create and manage exams
- View violation reports
- Review flagged attempts
- Accept/reject exam submissions

### AI Monitoring
- Face detection (identity verification)
- Multi-person detection
- Phone/object detection
- Looking away detection
- Browser activity tracking

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/exams | List published exams |
| POST | /api/exams | Create exam (admin) |
| GET | /api/exams/{id} | Get exam with questions |
| POST | /api/attempts | Start exam attempt |
| POST | /api/attempts/{id}/submit | Submit exam |
| POST | /api/violations | Log violation |
| GET | /api/violations/attempt/{id} | Get attempt violations |

## Violation Types

| Type | Severity | Description |
|------|----------|-------------|
| no_face_detected | High | No face visible for 10+ seconds |
| multiple_faces | High | Multiple people in frame |
| phone_detected | High | Mobile phone detected |
| tab_switch | Low-Medium | Browser tab changed |
| window_blur | Medium | Window lost focus |
| looking_away_excessive | Low | Looking away too long |

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Supabase Client
- **Backend**: FastAPI, Python, Supabase
- **AI Service**: OpenCV, NumPy
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth

## License

MIT
