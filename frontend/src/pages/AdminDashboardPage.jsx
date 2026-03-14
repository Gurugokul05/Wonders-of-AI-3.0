import { useEffect, useRef, useState } from "react";

import CandidateCard from "../components/CandidateCard";
import EventTimeline from "../components/EventTimeline";
import {
  fetchLiveExam,
  fetchSessionReport,
  fetchTimeline,
  login,
} from "../services/api";
import { getToken, getUser, setAuthSession } from "../services/auth";
import { generateCandidateReportPdf } from "../services/pdfReport";
import { createSocket } from "../services/socket";

const EXAM_ID = "EXAM-HACK-2026";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@trustmeter.ai";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "Admin@123";

function upsertTimelineEvent(events, incomingEvent) {
  const incomingId = String(incomingEvent?._id || "");
  if (!incomingId) {
    return [...events, incomingEvent].slice(-300);
  }

  const existingIndex = events.findIndex(
    (event) => String(event?._id || "") === incomingId,
  );

  if (existingIndex === -1) {
    return [...events, incomingEvent].slice(-300);
  }

  const next = [...events];
  next[existingIndex] = { ...next[existingIndex], ...incomingEvent };
  return next;
}

function AdminDashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const selectedSessionIdRef = useRef("");

  useEffect(() => {
    selectedSessionIdRef.current = selectedSession?._id || "";
  }, [selectedSession]);

  useEffect(() => {
    let mounted = true;
    let timer;

    function initSocket() {
      if (socketRef.current) return Promise.resolve(socketRef.current);

      return createSocket().then((socket) => {
        socketRef.current = socket;
        socket.emit("admin:join", { examId: EXAM_ID });
        socket.on("admin:session:update", (payload) => {
          setSessions((prev) => {
            const idx = prev.findIndex((s) => s._id === payload.sessionId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              currentScore: payload.score,
              riskLevel: payload.riskLevel,
              status: payload.sessionStatus || next[idx].status,
              updatedAt: new Date().toISOString(),
            };
            return next;
          });

          if (
            selectedSessionIdRef.current === payload.sessionId &&
            payload.event
          ) {
            setTimeline((prev) => upsertTimelineEvent(prev, payload.event));
          }
        });

        return socket;
      });
    }

    async function load() {
      try {
        const token = getToken();
        const user = getUser();
        if (!token || user?.role !== "admin") {
          const auth = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
          setAuthSession(auth.token, auth.user);
        }

        await initSocket();

        const data = await fetchLiveExam(EXAM_ID);
        if (mounted) setSessions(data);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load admin dashboard");
      }
    }

    load();
    timer = setInterval(load, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedSession?._id) {
      setTimeline([]);
      return undefined;
    }

    let cancelled = false;

    const loadTimeline = async () => {
      try {
        const events = await fetchTimeline(selectedSession._id);
        if (!cancelled) {
          setTimeline(events.reverse());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load timeline");
        }
      }
    };

    loadTimeline();
    const timer = setInterval(loadTimeline, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedSession?._id]);

  async function openTimeline(session) {
    setError("");
    setSelectedSession(session);
  }

  async function downloadReport(session) {
    try {
      const [report, timelineData] = await Promise.all([
        fetchSessionReport(session._id),
        fetchTimeline(session._id),
      ]);

      generateCandidateReportPdf({
        session,
        report,
        timeline: timelineData,
      });
    } catch (err) {
      setError(err.message || "Failed to generate PDF report");
    }
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>Trust Meter Sessions Dashboard</h2>
        <p>Exam: {EXAM_ID}</p>
        <div className="cards">
          {sessions.map((session) => (
            <CandidateCard
              key={session._id}
              session={session}
              onSelect={openTimeline}
              onDownloadReport={downloadReport}
            />
          ))}
          {sessions.length === 0 && <p>No sessions found for this exam yet.</p>}
        </div>
        {error && <p style={{ color: "#ae2012" }}>{error}</p>}
      </div>

      <div className="panel">
        <h3>Selected Timeline</h3>
        <p>Session: {selectedSession?._id || "None"}</p>
        <EventTimeline events={timeline} />
      </div>
    </section>
  );
}

export default AdminDashboardPage;
