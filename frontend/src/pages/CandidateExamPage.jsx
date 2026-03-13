import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import EventTimeline from "../components/EventTimeline";
import TrustMeter from "../components/TrustMeter";
import { useAudioMonitor } from "../hooks/useAudioMonitor";
import { useBrowserGuards } from "../hooks/useBrowserGuards";
import { useIncidentRecorder } from "../hooks/useIncidentRecorder";
import { useVisionMonitor } from "../hooks/useVisionMonitor";
import { useYoloMonitor } from "../hooks/useYoloMonitor";
import { login, startSession } from "../services/api";
import { getToken, setAuthSession } from "../services/auth";
import { createSocket } from "../services/socket";

const EXAM_ID = "EXAM-HACK-2026";
const CANDIDATE_EMAIL =
  import.meta.env.VITE_CANDIDATE_EMAIL || "candidate@trustmeter.ai";
const CANDIDATE_PASSWORD =
  import.meta.env.VITE_CANDIDATE_PASSWORD || "Candidate@123";

function CandidateExamPage() {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [score, setScore] = useState(100);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const { attachStream, markIncident } = useIncidentRecorder();

  const pushEvent = useCallback(
    async (ev) => {
      const fullEvent = { ...ev, timestamp: new Date().toISOString() };
      setEvents((prev) => [fullEvent, ...prev].slice(0, 150));

      if (
        ["critical", "high"].includes(ev.severity) ||
        ev.eventType === "PHONE_DETECTED"
      ) {
        await markIncident({
          eventType: ev.eventType,
          sessionId: session?._id,
        });
      }

      if (session?._id && socketRef.current) {
        socketRef.current.emit("event:ingest", {
          sessionId: session._id,
          event: fullEvent,
        });
      }
    },
    [markIncident, session],
  );

  useBrowserGuards(pushEvent);
  useAudioMonitor(active, pushEvent);
  useVisionMonitor({ enabled: active, videoRef, onEvent: pushEvent });
  useYoloMonitor({
    enabled: active,
    videoRef,
    sessionId: session?._id,
    onEvent: pushEvent,
  });

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream]);

  const examState = useMemo(
    () => (active ? "Monitoring Active" : "Idle"),
    [active],
  );

  async function startMonitoring() {
    setError("");
    try {
      if (!getToken()) {
        const auth = await login(CANDIDATE_EMAIL, CANDIDATE_PASSWORD);
        setAuthSession(auth.token, auth.user);
      }

      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
      await attachStream(media);

      const sessionDoc = await startSession(EXAM_ID, {
        candidate: {
          name: "Demo Candidate",
          email: `demo-${Date.now()}@trustmeter.ai`,
          institutionId: "HACKATHON-DEMO",
        },
        baseline: {
          calibrationDurationSec: 20,
          ambientAudioRms: 24.2,
          headPoseMean: 0.14,
          headPoseStd: 0.05,
        },
      });

      setSession(sessionDoc);
      setScore(sessionDoc.currentScore);
      setActive(true);

      const socket = createSocket();
      socketRef.current = socket;
      socket.emit("session:join", { sessionId: sessionDoc._id });
      socket.on("score:update", (payload) => {
        if (payload.sessionId === sessionDoc._id) {
          setScore(payload.score);
        }
      });

      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      setError(err.message || "Failed to initialize monitoring");
    }
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>Candidate Exam Console</h2>
        <p>
          Session state: <strong>{examState}</strong>
        </p>
        <TrustMeter score={score} />
        <p>Session ID: {session?._id || "Not started"}</p>
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.8rem" }}>
          <button onClick={startMonitoring}>Start Monitoring</button>
        </div>
        {error && <p style={{ color: "#ae2012" }}>{error}</p>}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-preview"
        />
      </div>

      <div className="panel">
        <h3>Suspicion Timeline</h3>
        <EventTimeline events={events} />
      </div>
    </section>
  );
}

export default CandidateExamPage;
