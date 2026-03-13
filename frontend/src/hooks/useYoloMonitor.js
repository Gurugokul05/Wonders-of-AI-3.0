import { useEffect, useRef } from "react";

import { detectYoloObjects } from "../services/api";

const PROHIBITED_OBJECTS = new Set(["cell phone", "phone", "book"]);
const PERSON_CONFIDENCE_MIN = 0.45;
const OBJECT_CONFIDENCE_MIN = 0.5;

const EVENT_COOLDOWN_MS = {
  MULTIPLE_FACES: 5000,
  PHONE_DETECTED: 6000,
  BOOK_DETECTED: 7000,
};

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
  const onEventRef = useRef(onEvent);
  const lastEventAtRef = useRef({});

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    const emitWithCooldown = (eventPayload) => {
      const eventType = eventPayload.eventType;
      const now = Date.now();
      const cooldown = EVENT_COOLDOWN_MS[eventType] ?? 4000;
      const lastAt = lastEventAtRef.current[eventType] ?? 0;
      if (now - lastAt < cooldown) return;
      lastEventAtRef.current[eventType] = now;
      onEventRef.current(eventPayload);
    };

    timerRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const frameBase64 = videoToDataUrl(video);
        const result = await detectYoloObjects({ frameBase64, sessionId });
        const detections = Array.isArray(result.detections)
          ? result.detections
          : [];

        const normalized = detections.map((det) => ({
          label: String(det.label || "").toLowerCase(),
          confidence: Number(det.confidence || 0.7),
          bbox: det.bbox || null,
        }));

        const persons = normalized.filter(
          (det) =>
            det.label === "person" && det.confidence >= PERSON_CONFIDENCE_MIN,
        );

        // Candidate should be one person. More than one indicates another person entered frame.
        if (persons.length > 1) {
          const topConfidence = persons.reduce(
            (max, det) => Math.max(max, det.confidence),
            0.7,
          );

          emitWithCooldown({
            eventType: "MULTIPLE_FACES",
            source: "cv",
            confidence: Number(topConfidence),
            metadata: {
              objectClass: "person",
              personCount: persons.length,
              detectorModel: result.model || "yolo",
            },
          });
        }

        normalized.forEach((det) => {
          if (!PROHIBITED_OBJECTS.has(det.label)) return;
          if (det.confidence < OBJECT_CONFIDENCE_MIN) return;

          emitWithCooldown({
            eventType: det.label.includes("phone")
              ? "PHONE_DETECTED"
              : "BOOK_DETECTED",
            source: "cv",
            confidence: det.confidence,
            metadata: {
              objectClass: det.label,
              bbox: det.bbox,
              detectorModel: result.model || "yolo",
            },
          });
        });
      } catch {
        // Detection endpoint may be unavailable during local dev.
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      lastEventAtRef.current = {};
    };
  }, [enabled, sessionId, videoRef]);
}
