import { useEffect, useRef } from "react";

const LOOK_AWAY_THRESHOLD = 0.115;
const HEAD_OFFSET_THRESHOLD = 0.155;
const HEAD_MOVEMENT_DELTA_THRESHOLD = 0.055;
const NO_FACE_STREAK_FRAMES = 4; // ~4.8s at 1200ms/frame

const EVENT_COOLDOWNS_MS = {
  NO_FACE_OVER_5S: 8000,
  MULTIPLE_FACES: 6000,
  LOOKING_AWAY_PATTERN: 5000,
  HEAD_MOVEMENT_ANOMALY: 4000,
  LEFT_FRAME: 6000,
};

export function useVisionMonitor({ enabled, videoRef, onEvent }) {
  const workerRef = useRef(null);
  const captureTimerRef = useRef(null);
  const noFaceStreakRef = useRef(0);
  const lastEventAtRef = useRef({});
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return undefined;

    noFaceStreakRef.current = 0;
    lastEventAtRef.current = {};

    const searchParams =
      typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
    const debugFlagFromQuery = searchParams?.get("visionDebug");
    const debugFlagFromStorage =
      typeof window !== "undefined"
      ? window.localStorage?.getItem("vision_debug")
      : null;
    const debugEnabled = import.meta.env.DEV && (
      debugFlagFromQuery === "1"
      || debugFlagFromStorage === "1"
      || (debugFlagFromQuery !== "0" && debugFlagFromStorage !== "0")
    );

    if (typeof window !== "undefined") {
      window.__visionDebugEnabled = debugEnabled;
      if (debugEnabled) {
        console.info(
          "[vision] debug enabled. Use window.__visionLast in console for latest frame analysis.",
        );
      }
    }

    const emitWithCooldown = (eventPayload) => {
      const now = Date.now();
      const eventType = eventPayload.eventType;
      const cooldown = EVENT_COOLDOWNS_MS[eventType] ?? 3000;
      const lastEmitted = lastEventAtRef.current[eventType] ?? 0;
      if (now - lastEmitted < cooldown) return;
      lastEventAtRef.current[eventType] = now;
      onEventRef.current(eventPayload);
    };

    const worker = new Worker(
      new URL("../workers/visionWorker.js", import.meta.url),
      {
        type: "module",
      },
    );
    workerRef.current = worker;

    if (typeof window !== "undefined") {
      window.__visionWorkerState = "starting";
    }

    worker.postMessage({ type: "init" });

    worker.onmessage = (msg) => {
      const payload = msg.data;
      if (!payload) return;

      if (payload.type === "ready") {
        if (typeof window !== "undefined") {
          window.__visionWorkerState = "ready";
        }
        if (debugEnabled) {
          console.info("[vision] worker ready");
        }
        return;
      }

      if (payload.type !== "analysis") return;

      const result = payload.result || {};
      if (typeof window !== "undefined") {
        window.__visionLast = {
          ts: Date.now(),
          provider: result.provider,
          faceCount: result.faceCount,
          gazeOffset: result.gazeOffset,
          headOffset: result.headOffset,
          headMovementDelta: result.headMovementDelta,
          focusVariance: result.focusVariance,
        };
      }

      if (debugEnabled) {
        console.debug("[vision]", {
          provider: result.provider,
          faceCount: result.faceCount,
          gazeOffset: Number((result.gazeOffset || 0).toFixed(3)),
          headOffset: Number((result.headOffset || 0).toFixed(3)),
          headMovementDelta: Number((result.headMovementDelta || 0).toFixed(3)),
          focusVariance: result.focusVariance,
        });
      }

      if (result.faceCount === 0) {
        noFaceStreakRef.current += 1;
        if (noFaceStreakRef.current >= NO_FACE_STREAK_FRAMES) {
          emitWithCooldown({
            eventType: "NO_FACE_OVER_5S",
            source: "cv",
            confidence: 0.86,
            metadata: {
              provider: result.provider,
              noFaceFrames: noFaceStreakRef.current,
            },
          });
        }
      } else if (result.faceCount > 1) {
        noFaceStreakRef.current = 0;
        emitWithCooldown({
          eventType: "MULTIPLE_FACES",
          source: "cv",
          confidence: 0.92,
          metadata: { faceCount: result.faceCount, provider: result.provider },
        });
      } else {
        noFaceStreakRef.current = 0;
      }

      if (result.gazeOffset > LOOK_AWAY_THRESHOLD) {
        emitWithCooldown({
          eventType: "LOOKING_AWAY_PATTERN",
          source: "cv",
          confidence: 0.74,
          metadata: {
            gazeOffset: Number(result.gazeOffset.toFixed(3)),
            provider: result.provider,
          },
        });
      }

      if (
        result.headOffset > HEAD_OFFSET_THRESHOLD ||
        result.headMovementDelta > HEAD_MOVEMENT_DELTA_THRESHOLD
      ) {
        emitWithCooldown({
          eventType: "HEAD_MOVEMENT_ANOMALY",
          source: "cv",
          confidence: 0.78,
          metadata: {
            headOffset: Number((result.headOffset || 0).toFixed(3)),
            headMovementDelta: Number(
              (result.headMovementDelta || 0).toFixed(3),
            ),
            provider: result.provider,
          },
        });
      }

      if (result.focusVariance !== null && result.focusVariance < 10) {
        emitWithCooldown({
          eventType: "LEFT_FRAME",
          source: "cv",
          confidence: 0.68,
          metadata: { focusVariance: Number(result.focusVariance.toFixed(2)) },
        });
      }
    };

    worker.onerror = (error) => {
      if (typeof window !== "undefined") {
        window.__visionWorkerState = "error";
      }
      if (debugEnabled) {
        console.error("[vision] worker error", error);
      }
    };

    const capture = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const bitmap = await createImageBitmap(video);
        worker.postMessage(
          { type: "frame", frame: bitmap, ts: performance.now() },
          [bitmap],
        );
      } catch {
        // Ignore transient frame extraction issues.
      }
    };

    captureTimerRef.current = setInterval(capture, 1200);

    return () => {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      worker.terminate();
      noFaceStreakRef.current = 0;
      if (typeof window !== "undefined") {
        window.__visionWorkerState = "stopped";
      }
    };
  }, [enabled, videoRef]);
}
