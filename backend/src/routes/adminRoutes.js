const express = require("express");
const ExamSession = require("../models/ExamSession");
const SuspiciousEvent = require("../models/SuspiciousEvent");
const ScoreSnapshot = require("../models/ScoreSnapshot");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireRole("admin"));

router.get("/admin/exams/:examId/live", async (req, res, next) => {
  try {
    const sessions = await ExamSession.find({
      examId: req.params.examId,
      status: "active",
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(sessions);
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/sessions/:sessionId/timeline", async (req, res, next) => {
  try {
    const events = await SuspiciousEvent.find({
      sessionId: req.params.sessionId,
    })
      .sort({ timestamp: -1 })
      .limit(300)
      .lean();

    return res.json(events);
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
