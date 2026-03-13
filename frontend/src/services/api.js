const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

import { getToken } from "./auth";

function withAuthHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonOrThrow(res, fallbackMessage) {
  if (!res.ok) {
    let details = fallbackMessage;
    try {
      const payload = await res.json();
      details = payload.message || fallbackMessage;
    } catch {
      details = fallbackMessage;
    }
    throw new Error(details);
  }

  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonOrThrow(res, "Login failed");
}

export async function startSession(examId, payload) {
  const res = await fetch(`${API_BASE}/exams/${examId}/sessions/start`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res, "Failed to start session");
}

export async function sendEventBatch(sessionId, events) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/events/batch`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ events }),
  });
  return parseJsonOrThrow(res, "Failed to send events");
}

export async function fetchLiveExam(examId) {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/live`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Failed to fetch live sessions");
}

export async function fetchTimeline(sessionId) {
  const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}/timeline`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Failed to fetch timeline");
}

export async function detectYoloObjects(payload) {
  const res = await fetch(`${API_BASE}/ai/yolo/detect`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseJsonOrThrow(res, "YOLO detection failed");
}

export async function uploadIncidentClip(sessionId, payload) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/clips`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res, "Clip upload failed");
}

export async function getSecureClipUrl(clipId) {
  const res = await fetch(`${API_BASE}/clips/${clipId}/secure-url`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Unable to get clip URL");
}
