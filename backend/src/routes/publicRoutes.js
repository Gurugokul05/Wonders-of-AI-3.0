const express = require("express");
const fs = require("fs");
const IncidentClip = require("../models/IncidentClip");
const {
  verifyClipToken,
  buildClipPath,
} = require("../services/clipStorageService");

const router = express.Router();

// Clip stream — uses signed-token auth in query string, no Bearer header needed.
// Must be mounted WITHOUT requireAuth so browsers can fetch via <video src="...">.
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

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    const mimeType = clip.mimeType || "application/octet-stream";
    const range = req.headers.range;

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=60");

    if (!range) {
      res.setHeader("Content-Length", totalSize);
      return fs.createReadStream(filePath).pipe(res);
    }

    const match = /bytes=(\d*)-(\d*)/.exec(String(range));
    if (!match) {
      res.setHeader("Content-Range", `bytes */${totalSize}`);
      return res.status(416).end();
    }

    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match[2] ? Number.parseInt(match[2], 10) : totalSize - 1;

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      start >= totalSize
    ) {
      res.setHeader("Content-Range", `bytes */${totalSize}`);
      return res.status(416).end();
    }

    const boundedEnd = Math.min(end, totalSize - 1);
    const chunkSize = boundedEnd - start + 1;

    res.status(206);
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Range", `bytes ${start}-${boundedEnd}/${totalSize}`);

    return fs.createReadStream(filePath, { start, end: boundedEnd }).pipe(res);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
