import { getToken } from "./auth";
import { resolveApiBase } from "./runtimeBackend";

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
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonOrThrow(res, "Login failed");
}

export async function startSession(examId, payload) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/exams/${examId}/sessions/start`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res, "Failed to start session");
}

export async function sendEventBatch(sessionId, events) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/sessions/${sessionId}/events/batch`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ events }),
  });
  return parseJsonOrThrow(res, "Failed to send events");
}

export async function fetchLiveExam(examId) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/admin/exams/${examId}/live`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Failed to fetch live sessions");
}

export async function fetchTimeline(sessionId) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/admin/sessions/${sessionId}/timeline`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Failed to fetch timeline");
}

export async function fetchSessionReport(sessionId) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/sessions/${sessionId}/report`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Failed to fetch session report");
}

export async function detectYoloObjects(payload) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/ai/yolo/detect`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseJsonOrThrow(res, "YOLO detection failed");
}

export async function uploadIncidentClip(sessionId, payload) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/sessions/${sessionId}/clips`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res, "Clip upload failed");
}

export async function getSecureClipUrl(clipId) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/clips/${clipId}/secure-url`, {
    headers: withAuthHeaders(),
  });
  return parseJsonOrThrow(res, "Unable to get clip URL");
}
