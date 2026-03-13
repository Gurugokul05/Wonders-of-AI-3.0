const express = require("express");
const Candidate = require("../models/Candidate");
const ExamSession = require("../models/ExamSession");
const SuspiciousEvent = require("../models/SuspiciousEvent");
const IncidentClip = require("../models/IncidentClip");
const { applyEventToSession } = require("../services/scoringEngine");
const { generateSessionReport } = require("../services/reportService");
const { requireRole } = require("../middleware/authMiddleware");
const {
  saveBase64Clip,
  signClipToken,
  verifyClipToken,
  buildClipPath,
} = require("../services/clipStorageService");
const fs = require("fs");

const router = express.Router();

router.post("/exams/:examId/sessions/start", async (req, res, next) => {
  try {
    const { candidateId, candidate } = req.body;
    let resolvedCandidateId = candidateId;

    if (!resolvedCandidateId && candidate) {
      const created = await Candidate.create(candidate);
      resolvedCandidateId = created._id;
    }

    if (!resolvedCandidateId) {
      return res
        .status(400)
        .json({ message: "candidateId or candidate payload is required" });
    }

    const session = await ExamSession.create({
      examId: req.params.examId,
      candidateId: resolvedCandidateId,
      startTime: new Date(),
      baseline: req.body.baseline || {},
      currentScore: 100,
    });

    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/exams/:examId/sessions/:sessionId/end",
  async (req, res, next) => {
    try {
      const session = await ExamSession.findOne({
        _id: req.params.sessionId,
        examId: req.params.examId,
      });

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      session.status = "completed";
      session.endTime = new Date();
      await session.save();

      const report = await generateSessionReport(session._id);
      return res.json({ session, report });
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/exams/:examId/sessions/:sessionId/status",
  async (req, res, next) => {
    try {
      const session = await ExamSession.findOne({
        _id: req.params.sessionId,
        examId: req.params.examId,
      }).lean();

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      return res.json(session);
    } catch (error) {
      return next(error);
    }
  },
);

router.post("/sessions/:sessionId/events/batch", async (req, res, next) => {
  try {
    const { events = [] } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: "events[] is required" });
    }

    const session = await ExamSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const applied = [];
    for (const event of events) {
      const result = await applyEventToSession(session, event);
      applied.push(result);
    }

    return res.status(201).json({
      sessionId: session._id,
      currentScore: session.currentScore,
      riskLevel: session.riskLevel,
      appliedCount: applied.length,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/sessions/:sessionId/clips", async (req, res, next) => {
  try {
    const { clipBase64, eventId, startOffsetSec, endOffsetSec, durationSec } =
      req.body || {};

    if (!clipBase64) {
      return res.status(400).json({ message: "clipBase64 is required" });
    }

    const savedFile = saveBase64Clip(clipBase64);

    const clip = await IncidentClip.create({
      sessionId: req.params.sessionId,
      eventId,
      startOffsetSec,
      endOffsetSec,
      durationSec,
      storageKey: savedFile.storageKey,
      storageUrl: `/api/clips/${String(savedFile.storageKey)}`,
      mimeType: savedFile.mimeType,
      byteSize: savedFile.byteSize,
      sha256: savedFile.sha256,
    });

    return res.status(201).json(clip);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/clips/:clipId/secure-url",
  requireRole("admin", "candidate"),
  async (req, res, next) => {
    try {
      const clip = await IncidentClip.findById(req.params.clipId).lean();
      if (!clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      const expiresAt = Date.now() + 5 * 60 * 1000;
      const token = signClipToken(clip._id, expiresAt);

      return res.json({
        clipId: clip._id,
        expiresAt,
        streamUrl: `/api/clips/${clip._id}/stream?token=${token}`,
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.get("/clips/:clipId/stream", async (req, res, next) => {
  try {
    const clip = await IncidentClip.findById(req.params.clipId).lean();
    if (!clip) {
      return res.status(404).json({ message: "Clip not found" });
    }

    if (!verifyClipToken(req.query.token, clip._id)) {
      return res.status(401).json({ message: "Invalid or expired clip token" });
    }

    const filePath = buildClipPath(clip.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Clip file missing" });
    }

    res.setHeader("Content-Type", clip.mimeType || "application/octet-stream");
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    return next(error);
  }
});

router.get("/sessions/:sessionId/timeline", async (req, res, next) => {
  try {
    const events = await SuspiciousEvent.find({
      sessionId: req.params.sessionId,
    })
      .sort({ timestamp: 1 })
      .lean();

    return res.json(events);
  } catch (error) {
    return next(error);
  }
});

router.post("/sessions/:sessionId/report/generate", async (req, res, next) => {
  try {
    const report = await generateSessionReport(req.params.sessionId);
    return res.status(201).json(report);
  } catch (error) {
    return next(error);
  }
});

router.get("/sessions/:sessionId/report", async (req, res, next) => {
  try {
    const report = await generateSessionReport(req.params.sessionId);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
