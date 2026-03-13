import { useRef } from "react";
import { uploadIncidentClip } from "../services/api";

export function useIncidentRecorder() {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function attachStream(stream) {
    if (!stream || recorderRef.current) return;
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) {
          chunksRef.current.push(ev.data);
          if (chunksRef.current.length > 8) {
            chunksRef.current.shift();
          }
        }
      };

      recorder.start(1000);
      recorderRef.current = recorder;
    } catch (error) {
      console.warn("Clip recorder unavailable", error);
    }
  }

  async function markIncident({ eventType, sessionId, eventId }) {
    if (!sessionId || !recorderRef.current || chunksRef.current.length === 0) {
      return { ok: false, reason: "recorder-not-ready" };
    }

    try {
      const blob = new Blob(chunksRef.current.slice(-4), {
        type: "video/webm",
      });
      const dataUrl = await blobToDataUrl(blob);
      const clip = await uploadIncidentClip(sessionId, {
        eventId,
        startOffsetSec: -4,
        endOffsetSec: 0,
        durationSec: 4,
        clipBase64: dataUrl,
      });
      return { ok: true, eventType, clipId: clip._id };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  return { attachStream, markIncident };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}
