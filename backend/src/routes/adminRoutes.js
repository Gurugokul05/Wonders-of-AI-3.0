const express = require("express");
const ExamSession = require("../models/ExamSession");
const SuspiciousEvent = require("../models/SuspiciousEvent");
const ScoreSnapshot = require("../models/ScoreSnapshot");
const IncidentClip = require("../models/IncidentClip");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireRole("admin"));

router.get("/admin/exams/:examId/live", async (req, res, next) => {
  try {
    const requestedStatus = String(req.query.status || "all").toLowerCase();
    const statusFilter =
      requestedStatus === "all"
        ? ["active", "terminated", "completed"]
        : requestedStatus
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

    const sessions = await ExamSession.find({
      examId: req.params.examId,
      status: {
        $in:
          statusFilter.length > 0
            ? statusFilter
            : ["active", "terminated", "completed"],
      },
    })
      .populate("candidateId", "name email institutionId")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(sessions);
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/sessions/:sessionId/timeline", async (req, res, next) => {
  try {
    const [events, clips] = await Promise.all([
      SuspiciousEvent.find({
        sessionId: req.params.sessionId,
      })
        .sort({ timestamp: -1 })
        .limit(300)
        .populate("clipId", "_id durationSec mimeType createdAt")
        .lean(),
      IncidentClip.find({
        sessionId: req.params.sessionId,
        eventId: { $exists: true, $ne: null },
      })
        .sort({ createdAt: -1 })
        .select("_id eventId durationSec mimeType createdAt")
        .lean(),
    ]);

    const clipByEventId = new Map(
      clips.map((clip) => [String(clip.eventId), clip]),
    );

    return res.json(
      events.map((event) => ({
        ...event,
        clip: event.clipId || clipByEventId.get(String(event._id)) || null,
        clipId:
          event.clipId?._id ||
          event.clipId ||
          clipByEventId.get(String(event._id))?._id ||
          null,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/admin/sessions/:sessionId/score-history",
  async (req, res, next) => {
    try {
      const points = await ScoreSnapshot.find({
        sessionId: req.params.sessionId,
      })
        .sort({ timestamp: 1 })
        .lean();

      return res.json(points);
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
