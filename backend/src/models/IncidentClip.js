const mongoose = require("mongoose");

const incidentClipSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
      index: true,
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "SuspiciousEvent" },
    startOffsetSec: { type: Number, required: true },
    endOffsetSec: { type: Number, required: true },
    storageKey: { type: String, required: true, index: true },
    storageUrl: { type: String },
    mimeType: { type: String, default: "video/webm" },
    byteSize: { type: Number, default: 0 },
    sha256: { type: String },
    durationSec: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IncidentClip", incidentClipSchema);
