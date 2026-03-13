const SuspiciousEvent = require("../models/SuspiciousEvent");
const ScoreSnapshot = require("../models/ScoreSnapshot");

const TERMINATION_SCORE_THRESHOLD = 40;

const EVENT_WEIGHTS = {
  MULTIPLE_FACES: 25,
  NO_FACE_OVER_5S: 15,
  LOOKING_AWAY_PATTERN: 10,
  HEAD_MOVEMENT_ANOMALY: 12,
  LEFT_FRAME: 20,
  PHONE_DETECTED: 30,
  BOOK_DETECTED: 20,
  KEYBOARD_ACTIVITY: 8,
  SHORTCUT_COPY_PASTE: 8,
  LARGE_PASTE: 12,
  TAB_HIDDEN: 15,
  FULLSCREEN_EXIT: 18,
  BACKGROUND_VOICE: 12,
};

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function getRiskLevel(score) {
  if (score < 60) return "high";
  if (score < 80) return "medium";
  return "low";
}

function getSeverity(weight) {
  if (weight >= 28) return "critical";
  if (weight >= 18) return "high";
  if (weight >= 10) return "medium";
  return "low";
}

async function applyEventToSession(session, rawEvent) {
  const eventType = rawEvent.eventType || "UNKNOWN";
  const baseWeight = EVENT_WEIGHTS[eventType] ?? 5;
  const confidence = clamp(rawEvent.confidence ?? 0.7, 0, 1);
  const repetitionFactor = clamp(rawEvent.repetitionFactor ?? 1, 1, 2);
  const contextFactor = clamp(rawEvent.contextFactor ?? 1, 0.5, 1.5);

  const penalty = Number(
    (baseWeight * confidence * repetitionFactor * contextFactor).toFixed(2),
  );
  session.currentScore = clamp(
    Number((session.currentScore - penalty).toFixed(2)),
    0,
    100,
  );
  session.riskLevel = getRiskLevel(session.currentScore);

  if (
    session.status === "active"
    && session.currentScore < TERMINATION_SCORE_THRESHOLD
  ) {
    session.status = "terminated";
    session.endTime = new Date();
  }

  const severity = rawEvent.severity || getSeverity(baseWeight);
  const source = rawEvent.source || "system";
  const timestamp = rawEvent.timestamp
    ? new Date(rawEvent.timestamp)
    : new Date();

  const savedEvent = await SuspiciousEvent.create({
    sessionId: session._id,
    candidateId: session.candidateId,
    timestamp,
    eventType,
    severity,
    confidence,
    penaltyApplied: penalty,
    source,
    metadata: rawEvent.metadata || {},
    frameRef: rawEvent.frameRef || undefined,
  });

  await ScoreSnapshot.create({
    sessionId: session._id,
    timestamp,
    score: session.currentScore,
    reason: eventType,
  });

  await session.save();

  return {
    event: savedEvent,
    score: session.currentScore,
    riskLevel: session.riskLevel,
    sessionStatus: session.status,
    terminated: session.status === "terminated",
    terminationThreshold: TERMINATION_SCORE_THRESHOLD,
  };
}

module.exports = {
  EVENT_WEIGHTS,
  TERMINATION_SCORE_THRESHOLD,
  getRiskLevel,
  applyEventToSession,
};
