const mongoose = require("mongoose");

const suspiciousEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    timestamp: { type: Date, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    penaltyApplied: { type: Number, required: true },
    source: {
      type: String,
      enum: ["cv", "audio", "browser", "system"],
      required: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    clipId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentClip" },
    frameRef: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SuspiciousEvent", suspiciousEventSchema);
