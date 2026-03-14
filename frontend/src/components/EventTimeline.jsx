import { useEffect, useState } from "react";

import { getIncidentClipStreamUrl } from "../services/api";

const EVENT_LABELS = {
  PHONE_DETECTED: "Phone Detected",
  MULTIPLE_FACES: "Multiple Faces",
  FULLSCREEN_EXIT: "Fullscreen Exited",
  LEFT_FRAME: "Left Camera Frame",
  BOOK_DETECTED: "Book Detected",
  TAB_HIDDEN: "Tab Hidden",
  NO_FACE_OVER_5S: "No Face (5s+)",
  BACKGROUND_VOICE: "Background Voice",
  HEAD_MOVEMENT_ANOMALY: "Head Movement",
  LARGE_PASTE: "Large Paste",
  LOOKING_AWAY_PATTERN: "Looking Away",
  SHORTCUT_COPY_PASTE: "Copy/Paste Shortcut",
  KEYBOARD_ACTIVITY: "Rapid Keyboard Activity",
};

function getEventLabel(eventType) {
  return EVENT_LABELS[eventType] || eventType;
}

function getMetadataDetail(event) {
  const m = event.metadata || {};
  switch (event.eventType) {
    case "MULTIPLE_FACES": {
      const count = m.faceCount || m.personCount;
      return count ? `${count} faces detected` : null;
    }
    case "PHONE_DETECTED":
    case "BOOK_DETECTED":
      return m.objectClass ? `Object: ${m.objectClass}` : null;
    case "HEAD_MOVEMENT_ANOMALY": {
      const parts = [];
      if (m.headOffset != null) parts.push(`offset ${m.headOffset}`);
      if (m.headMovementDelta != null)
        parts.push(`delta ${m.headMovementDelta}`);
      return parts.length ? parts.join(", ") : null;
    }
    case "LOOKING_AWAY_PATTERN":
      return m.gazeOffset != null ? `gaze offset ${m.gazeOffset}` : null;
    case "LARGE_PASTE":
      return m.pastedLength != null ? `${m.pastedLength} chars pasted` : null;
    case "NO_FACE_OVER_5S":
      return m.noFaceFrames != null
        ? `${m.noFaceFrames} frames without face`
        : null;
    default:
      return null;
  }
}

function resolveClip(event) {
  if (event?.clip) {
    return event.clip;
  }

  if (event?.clipId && typeof event.clipId === "object") {
    return event.clipId;
  }

  return null;
}

function resolveClipId(event) {
  const clip = resolveClip(event);
  return normalizeObjectId(clip?._id || event?.clipId);
}

function normalizeObjectId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
    if (typeof value.toString === "function") {
      const asString = value.toString();
      if (asString && asString !== "[object Object]") {
        return asString;
      }
    }
  }

  return null;
}

function formatDuration(durationSec) {
  if (!durationSec) return "Evidence clip";
  return `${Math.round(durationSec)}s evidence clip`;
}

function isEvidencePending(event, nowMs) {
  if (resolveClipId(event)) return false;
  const timestampMs = new Date(event?.timestamp || 0).getTime();
  if (!timestampMs) return false;
  return nowMs - timestampMs < 25000;
}

function EventTimeline({ events }) {
  const [expandedClipId, setExpandedClipId] = useState("");
  const [clipUrls, setClipUrls] = useState({});
  const [clipErrors, setClipErrors] = useState({});
  const [loadingClipId, setLoadingClipId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const firstEventWithClip = events.find((event) => resolveClipId(event));
    const firstClipId = firstEventWithClip
      ? resolveClipId(firstEventWithClip)
      : null;

    if (!firstClipId) {
      return;
    }

    let cancelled = false;

    if (clipUrls[firstClipId]) {
      setExpandedClipId((prev) => prev || firstClipId);
      return;
    }

    if (loadingClipId === firstClipId) {
      return;
    }

    setLoadingClipId(firstClipId);
    setClipErrors((prev) => ({ ...prev, [firstClipId]: "" }));

    getIncidentClipStreamUrl(firstClipId)
      .then((streamUrl) => {
        if (cancelled) return;
        setClipUrls((prev) => ({ ...prev, [firstClipId]: streamUrl }));
        setExpandedClipId((prev) => prev || firstClipId);
      })
      .catch((error) => {
        if (cancelled) return;
        setClipErrors((prev) => ({
          ...prev,
          [firstClipId]: error.message || "Unable to load evidence clip",
        }));
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingClipId((prev) => (prev === firstClipId ? "" : prev));
      });

    return () => {
      cancelled = true;
    };
  }, [events, clipUrls, loadingClipId]);

  async function toggleEvidence(clipId) {
    if (!clipId) return;

    if (expandedClipId === clipId) {
      setExpandedClipId("");
      return;
    }

    setLoadingClipId(clipId);
    setClipErrors((prev) => ({ ...prev, [clipId]: "" }));

    try {
      const streamUrl = await getIncidentClipStreamUrl(clipId);
      setClipUrls((prev) => ({ ...prev, [clipId]: streamUrl }));
      setExpandedClipId(clipId);
    } catch (error) {
      setClipErrors((prev) => ({
        ...prev,
        [clipId]: error.message || "Unable to load evidence clip",
      }));
    } finally {
      setLoadingClipId("");
    }
  }

  function handleVideoError(clipId) {
    setClipErrors((prev) => ({
      ...prev,
      [clipId]: "Unable to play evidence clip. Try reopening it.",
    }));
    setClipUrls((prev) => {
      const next = { ...prev };
      delete next[clipId];
      return next;
    });
  }

  return (
    <ul className="event-list">
      {events.map((event, idx) => (
        <li key={event._id || `${event.timestamp || Date.now()}-${idx}`}>
          <strong>{getEventLabel(event.eventType)}</strong>
          <div>
            source: {event.source || "-"} | confidence:{" "}
            {event.confidence != null
              ? (event.confidence * 100).toFixed(0) + "%"
              : "-"}
          </div>
          {getMetadataDetail(event) && (
            <div>
              <small style={{ color: "#5b6268" }}>
                {getMetadataDetail(event)}
              </small>
            </div>
          )}
          <small>
            {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
          </small>
          {!resolveClipId(event) && isEvidencePending(event, nowMs) && (
            <div style={{ marginTop: "0.45rem" }}>
              <small style={{ color: "#9a6700" }}>
                Recording evidence clip... available in admin shortly.
              </small>
            </div>
          )}
          {resolveClipId(event) && (
            <div style={{ marginTop: "0.55rem" }}>
              <button
                className="secondary"
                onClick={() => toggleEvidence(resolveClipId(event))}
                disabled={loadingClipId === resolveClipId(event)}
              >
                {loadingClipId === resolveClipId(event)
                  ? "Loading Evidence..."
                  : expandedClipId === resolveClipId(event)
                    ? "Hide Evidence"
                    : "View Evidence"}
              </button>
              <div>
                <small>{formatDuration(resolveClip(event)?.durationSec)}</small>
              </div>
              {clipErrors[resolveClipId(event)] && (
                <small style={{ color: "#ae2012" }}>
                  {clipErrors[resolveClipId(event)]}
                </small>
              )}
              {expandedClipId === resolveClipId(event) &&
                clipUrls[resolveClipId(event)] && (
                  <video
                    controls
                    preload="metadata"
                    src={clipUrls[resolveClipId(event)]}
                    onError={() => handleVideoError(resolveClipId(event))}
                    style={{
                      marginTop: "0.6rem",
                      width: "100%",
                      maxHeight: 220,
                    }}
                  />
                )}
            </div>
          )}
        </li>
      ))}
      {events.length === 0 && <li>No suspicious events yet.</li>}
    </ul>
  );
}

export default EventTimeline;
