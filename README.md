# TRUST METER - AI Based Online Exam Integrity Monitoring System

This repository contains a hackathon-ready MVP for TRUST METER using:

- Frontend: React + Vite
- Backend: Express + Socket.IO
- Database: MongoDB (Mongoose)

## Current MVP Status

Implemented:

- Exam session start/end/status APIs
- Suspicious event ingestion API and websocket ingestion
- Dynamic integrity score updates with weighted penalties
- Suspicion timeline persistence in MongoDB
- Basic report generation
- Candidate journey flow:
  - Landing page
  - Candidate login page
  - Enter test step
  - Start test step
  - Score-focused test view (trust score only)
- Candidate UI with browser guard monitoring:
  - Tab visibility detection
  - Fullscreen exit detection
  - Keyboard shortcut detection (copy/paste/select-all)
  - Large paste detection
  - Microphone energy anomaly monitor
- Admin live dashboard showing sessions and timelines
- Admin PDF report generation for each candidate session

Prototype notes:

- Vision monitoring is running via a MediaPipe worker (`frontend/src/workers/visionWorker.js`)
- YOLO route exists and can connect to external inference service via `YOLO_INFERENCE_URL`
- Incident clip recorder supports local capture/upload flow for suspicious events

## Folder Structure

- `backend/` Express API, scoring engine, websocket ingestion, Mongo models
- `frontend/` Candidate and admin React interfaces

## Quick Start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend default URL: `http://localhost:5000` (auto-fallback to next free port if occupied)

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Key API Endpoints

- `POST /api/exams/:examId/sessions/start`
- `POST /api/exams/:examId/sessions/:sessionId/end`
- `GET /api/exams/:examId/sessions/:sessionId/status`
- `POST /api/sessions/:sessionId/events/batch`
- `POST /api/sessions/:sessionId/clips`
- `POST /api/sessions/:sessionId/report/generate`
- `GET /api/sessions/:sessionId/report`
- `GET /api/admin/exams/:examId/live`
- `GET /api/admin/sessions/:sessionId/timeline`
- `GET /api/admin/sessions/:sessionId/score-history`

## Real AI Integration Plan

Replace simulated hooks with production modules:

- OpenCV/MediaPipe in browser workers for face presence + gaze/head pose
- YOLO inference service for prohibited object detection
- VAD/speech detector for audio conversation detection
- Circular video buffer uploader for incident clip capture

## Demo Flow

1. Open landing page (`/`)
2. Click `Candidate Login`
3. Login as candidate and go to `/candidate/test`
4. Click `Enter Test`
5. Click `Start Test`
6. Trigger suspicious events:
   - Switch tab
   - Exit fullscreen
   - Press Ctrl+C / Ctrl+V
   - Paste large text
7. Open admin page (`/admin`) in another window
8. Observe real-time score drops and timeline updates
9. Click `Download PDF Report` on any candidate card to export session report

## Demo Credentials

- Candidate: `candidate@trustmeter.ai` / `Candidate@123`
- Admin: `admin@trustmeter.ai` / `Admin@123`

## Notes

- This MVP is designed for rapid hackathon demonstration and architecture validation.
- Before production use, add authentication, stronger privacy controls, storage hardening, and model calibration for false positive reduction.
