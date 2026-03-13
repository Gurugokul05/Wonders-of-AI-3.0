const express = require("express");

const router = express.Router();

function normalizeDetection(det) {
  return {
    label: det.label || det.class || "unknown",
    confidence: Number(det.confidence || 0),
    bbox: det.bbox || det.box || null,
  };
}

router.post("/ai/yolo/detect", async (req, res, next) => {
  try {
    const { frameBase64, sessionId } = req.body || {};
    if (!frameBase64) {
      return res.status(400).json({ message: "frameBase64 is required" });
    }

    if (process.env.YOLO_INFERENCE_URL) {
      const remoteRes = await fetch(process.env.YOLO_INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.YOLO_INFERENCE_TOKEN
            ? { Authorization: `Bearer ${process.env.YOLO_INFERENCE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ frameBase64, sessionId }),
      });

      if (!remoteRes.ok) {
        return res
          .status(502)
          .json({ message: "YOLO inference upstream failed" });
      }

      const payload = await remoteRes.json();
      const detections = Array.isArray(payload.detections)
        ? payload.detections.map(normalizeDetection)
        : [];

      return res.json({ model: payload.model || "yolo-upstream", detections });
    }

    // Fallback heuristic for hackathon mode when upstream YOLO service is absent.
    return res.json({ model: "yolo-fallback", detections: [] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
