const mongoose = require("mongoose");

const baselineSchema = new mongoose.Schema(
  {
    headPoseMean: { type: Number, default: 0 },
    headPoseStd: { type: Number, default: 0 },
    ambientAudioRms: { type: Number, default: 0 },
    calibrationDurationSec: { type: Number, default: 0 },
  },
  { _id: false },
);

const examSessionSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true, index: true },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ["active", "completed", "terminated"],
      default: "active",
      index: true,
    },
    baseline: { type: baselineSchema, default: () => ({}) },
    currentScore: { type: Number, default: 100 },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ExamSession", examSessionSchema);
