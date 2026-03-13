import { useEffect, useRef } from "react";

import { detectYoloObjects } from "../services/api";

const PROHIBITED_CLASSES = new Set(["cell phone", "phone", "book", "person"]);

function videoToDataUrl(video) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 360;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function useYoloMonitor({ enabled, videoRef, sessionId, onEvent }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !videoRef.current || !sessionId) return undefined;

    timerRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const frameBase64 = videoToDataUrl(video);
        const result = await detectYoloObjects({ frameBase64, sessionId });
        const detections = result.detections || [];

        detections.forEach((det) => {
          const label = String(det.label || "").toLowerCase();
          if (!PROHIBITED_CLASSES.has(label)) return;

          onEvent({
            eventType: label.includes("phone")
              ? "PHONE_DETECTED"
              : "BOOK_DETECTED",
            source: "cv",
            confidence: Number(det.confidence || 0.7),
            metadata: {
              objectClass: label,
              bbox: det.bbox || null,
              detectorModel: result.model || "yolo",
            },
          });
        });
      } catch {
        // Detection endpoint may be unavailable during local dev.
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, onEvent, sessionId, videoRef]);
}
