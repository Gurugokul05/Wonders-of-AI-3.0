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
- Candidate UI with browser guard monitoring:
  - Tab visibility detection
  - Fullscreen exit detection
  - Keyboard shortcut detection (copy/paste/select-all)
  - Large paste detection
  - Microphone energy anomaly monitor
- Admin live dashboard showing sessions and timelines

Prototype placeholders (ready to replace with real models):

- Computer vision events are currently simulated in `frontend/src/hooks/useSimulatedVision.js`
- Incident clip recorder is scaffolded in `frontend/src/hooks/useIncidentRecorder.js`

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

Backend default URL: `http://localhost:5000`

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

1. Open candidate page (`/`) and click `Start Monitoring`
2. Trigger suspicious events:
   - Switch tab
   - Exit fullscreen
   - Press Ctrl+C / Ctrl+V
   - Paste large text
3. Open admin page (`/admin`) in another window
4. Observe real-time score drops and timeline updates

## Notes

- This MVP is designed for rapid hackathon demonstration and architecture validation.
- Before production use, add authentication, stronger privacy controls, storage hardening, and model calibration for false positive reduction.
