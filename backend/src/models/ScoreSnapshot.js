const mongoose = require("mongoose");

const scoreSnapshotSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
      index: true,
    },
    timestamp: { type: Date, required: true, index: true },
    score: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ScoreSnapshot", scoreSnapshotSchema);
