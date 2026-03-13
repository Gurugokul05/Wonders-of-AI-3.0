const mongoose = require("mongoose");

const integrityReportSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
      unique: true,
    },
    generatedAt: { type: Date, required: true },
    initialScore: { type: Number, required: true },
    finalScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    eventSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    criticalIncidents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    timelineRefs: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "SuspiciousEvent",
      default: [],
    },
    reviewerNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IntegrityReport", integrityReportSchema);
