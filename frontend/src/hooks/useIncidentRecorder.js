import { useEffect, useRef } from "react";
import { uploadIncidentClip } from "../services/api";

export function useIncidentRecorder() {
  const streamRef = useRef(null);
  const activeCaptureRef = useRef(null);

  useEffect(() => {
    return () => {
      streamRef.current = null;
      activeCaptureRef.current = null;
    };
  }, []);

  async function attachStream(stream) {
    if (!stream) return;
    streamRef.current = stream;
  }

  function startCapture(durationSec = 5) {
    if (!streamRef.current) return null;

    return getActiveCapture(activeCaptureRef, streamRef.current, durationSec);
  }

  async function markIncident({
    eventType,
    sessionId,
    eventId,
    durationSec = 5,
    capture = null,
  }) {
    const normalizedEventId = normalizeObjectId(eventId);

    if (!sessionId || !normalizedEventId || !streamRef.current) {
      return { ok: false, reason: "recorder-not-ready" };
    }

    try {
      const activeCapture =
        capture ||
        getActiveCapture(activeCaptureRef, streamRef.current, durationSec);
      const result = await activeCapture.promise;

      if (!result?.dataUrl) {
        return { ok: false, reason: "clip-not-captured" };
      }

      const clip = await uploadIncidentClip(sessionId, {
        eventId: normalizedEventId,
        startOffsetSec: 0,
        endOffsetSec: result.durationSec,
        durationSec: result.durationSec,
        clipBase64: result.dataUrl,
      });
      return { ok: true, eventType, clipId: clip._id };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  return { attachStream, startCapture, markIncident };
}

function normalizeObjectId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    if (typeof value.$oid === "string") {
      return value.$oid;
    }

    if (typeof value._id === "string") {
      return value._id;
    }

    if (typeof value.toString === "function") {
      const stringified = value.toString();
      if (stringified && stringified !== "[object Object]") {
        return stringified;
      }
    }
  }

  return "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function getPreferredRecorderOptions() {
  const supports =
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function";

  if (supports && MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
    return {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 350000,
      audioBitsPerSecond: 64000,
    };
  }

  if (supports && MediaRecorder.isTypeSupported("video/webm")) {
    return {
      mimeType: "video/webm",
      videoBitsPerSecond: 350000,
      audioBitsPerSecond: 64000,
    };
  }

  return {
    videoBitsPerSecond: 350000,
    audioBitsPerSecond: 64000,
  };
}

function getActiveCapture(activeCaptureRef, stream, durationSec) {
  const captureWindowMs = Math.max(1000, Math.round(durationSec * 1000));
  const currentCapture = activeCaptureRef.current;
  const now = Date.now();

  if (currentCapture && now - currentCapture.startedAt < captureWindowMs) {
    return currentCapture;
  }

  const promise = recordClip(stream, captureWindowMs);
  const capture = {
    startedAt: now,
    promise,
  };

  activeCaptureRef.current = capture;
  promise.finally(() => {
    if (activeCaptureRef.current === capture) {
      activeCaptureRef.current = null;
    }
  });

  return capture;
}

function recordClip(stream, durationMs) {
  return new Promise((resolve, reject) => {
    let recorder;
    const chunks = [];
    const options = getPreferredRecorderOptions();

    try {
      recorder = new MediaRecorder(stream, options);
    } catch (error) {
      reject(new Error("Clip recorder unavailable"));
      return;
    }

    const startedAt = Date.now();
    const stopTimer = window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, durationMs);

    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      window.clearTimeout(stopTimer);
      reject(new Error("Clip recorder failed"));
    };

    recorder.onstop = async () => {
      window.clearTimeout(stopTimer);

      try {
        if (chunks.length === 0) {
          reject(new Error("clip-not-captured"));
          return;
        }

        const blob = new Blob(chunks, {
          type: recorder.mimeType || options.mimeType || "video/webm",
        });
        const dataUrl = await blobToDataUrl(blob);
        const measuredDurationSec = Math.max(
          1,
          Math.round((Date.now() - startedAt) / 1000),
        );

        resolve({
          dataUrl,
          durationSec: measuredDurationSec,
        });
      } catch (error) {
        reject(error);
      }
    };

    recorder.start();
  });
}
