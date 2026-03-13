import { useEffect, useRef } from "react";

const LOOK_AWAY_THRESHOLD = 0.14;

export function useVisionMonitor({ enabled, videoRef, onEvent }) {
  const workerRef = useRef(null);
  const captureTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !videoRef.current) return undefined;

    const worker = new Worker(
      new URL("../workers/visionWorker.js", import.meta.url),
      {
        type: "module",
      },
    );
    workerRef.current = worker;

    worker.postMessage({ type: "init" });

    worker.onmessage = (msg) => {
      const payload = msg.data;
      if (!payload || payload.type !== "analysis") return;

      const result = payload.result || {};
      if (result.faceCount === 0) {
        onEvent({
          eventType: "NO_FACE_OVER_5S",
          source: "cv",
          confidence: 0.86,
          metadata: { provider: result.provider },
        });
      } else if (result.faceCount > 1) {
        onEvent({
          eventType: "MULTIPLE_FACES",
          source: "cv",
          confidence: 0.92,
          metadata: { faceCount: result.faceCount, provider: result.provider },
        });
      }

      if (result.gazeOffset > LOOK_AWAY_THRESHOLD) {
        onEvent({
          eventType: "LOOKING_AWAY_PATTERN",
          source: "cv",
          confidence: 0.74,
          metadata: {
            gazeOffset: Number(result.gazeOffset.toFixed(3)),
            provider: result.provider,
          },
        });
      }

      if (result.focusVariance !== null && result.focusVariance < 10) {
        onEvent({
          eventType: "LEFT_FRAME",
          source: "cv",
          confidence: 0.68,
          metadata: { focusVariance: Number(result.focusVariance.toFixed(2)) },
        });
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
    };
  }, [enabled, onEvent, videoRef]);
}
