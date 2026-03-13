const IntegrityReport = require("../models/IntegrityReport");
const SuspiciousEvent = require("../models/SuspiciousEvent");
const ExamSession = require("../models/ExamSession");

async function generateSessionReport(sessionId) {
  const session = await ExamSession.findById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const events = await SuspiciousEvent.find({ sessionId })
    .sort({ timestamp: 1 })
    .lean();

  const eventSummary = events.reduce((acc, ev) => {
    acc[ev.eventType] = (acc[ev.eventType] || 0) + 1;
    return acc;
  }, {});

  const criticalIncidents = events.filter(
    (ev) => ev.severity === "critical" || ev.severity === "high",
  );

  const reportDoc = {
    sessionId: session._id,
    generatedAt: new Date(),
    initialScore: 100,
    finalScore: session.currentScore,
    riskLevel: session.riskLevel,
    eventSummary,
    criticalIncidents: criticalIncidents.slice(0, 20),
    timelineRefs: events.map((ev) => ev._id),
  };

  const report = await IntegrityReport.findOneAndUpdate(
    { sessionId: session._id },
    reportDoc,
    { new: true, upsert: true },
  );

  return report;
}

module.exports = { generateSessionReport };
