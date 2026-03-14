import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import TrustMeter from "../components/TrustMeter";
import { useAudioMonitor } from "../hooks/useAudioMonitor";
import { useBrowserGuards } from "../hooks/useBrowserGuards";
import { useIncidentRecorder } from "../hooks/useIncidentRecorder";
import { useVisionMonitor } from "../hooks/useVisionMonitor";
import { useYoloMonitor } from "../hooks/useYoloMonitor";
import { startSession } from "../services/api";
import { clearAuthSession, getToken, getUser } from "../services/auth";
import { createSocket } from "../services/socket";

const EXAM_ID = "EXAM-HACK-2026";
const EXAM_NAME = "Wonders of AI 3.0 – Hackathon Qualifier";
const DURATION_SECS = 45 * 60;
const TERMINATION_SCORE_THRESHOLD = 40;

const QUESTIONS = [
  {
    id: 1,
    text: "Which of the following best describes Artificial Intelligence?",
    options: [
      "A branch of mathematics dealing exclusively with statistics",
      "The simulation of human intelligence processes by machines",
      "Software that can only perform rule-based operations",
      "A hardware architecture designed for fast numerical computation",
    ],
  },
  {
    id: 2,
    text: "What is the key distinction between Machine Learning and traditional programming?",
    options: [
      "ML requires significantly more memory than traditional programs",
      "ML learns patterns from data rather than following explicit, hand-coded rules",
      "Traditional programming is built on neural networks",
      "ML can only handle purely numeric data inputs",
    ],
  },
  {
    id: 3,
    text: "Which of the following is NOT a recognised type of Machine Learning?",
    options: [
      "Supervised Learning",
      "Unsupervised Learning",
      "Reinforcement Learning",
      "Declarative Learning",
    ],
  },
  {
    id: 4,
    text: "Deep Learning is best described as:",
    options: [
      "An exclusive sub-field of data science unrelated to ML",
      "A subset of Machine Learning that uses multi-layered neural networks",
      "A synonym for Big Data analytics",
      "A cloud computing paradigm",
    ],
  },
  {
    id: 5,
    text: "In a neural network, the primary purpose of hidden layers is to:",
    options: [
      "Store the raw training dataset",
      "Extract and learn hierarchical feature representations from input",
      "Produce the final prediction output only",
      "Define the loss function used during training",
    ],
  },
  {
    id: 6,
    text: "Overfitting in a Machine Learning model means:",
    options: [
      "The model is too simple and cannot learn any useful pattern",
      "The model performs very well on training data but poorly on unseen data",
      "The model refuses to update beyond a fixed number of iterations",
      "The model requires too much computational hardware to run",
    ],
  },
  {
    id: 7,
    text: "Natural Language Processing (NLP) primarily focuses on:",
    options: [
      "Detecting objects in images and video streams",
      "Enabling machines to understand and generate human language",
      "Planning motion trajectories for robotic systems",
      "Forecasting numerical time-series data",
    ],
  },
  {
    id: 8,
    text: "Which architecture introduced the self-attention mechanism that transformed modern NLP?",
    options: [
      "ResNet (Residual Network)",
      "LSTM (Long Short-Term Memory)",
      "Transformer",
      "GAN (Generative Adversarial Network)",
    ],
  },
  {
    id: 9,
    text: "The acronym GPT stands for:",
    options: [
      "Generalized Pre-Trained Technology",
      "Generative Pre-trained Transformer",
      "Graph Processing Tensor",
      "Global Prediction Tool",
    ],
  },
  {
    id: 10,
    text: "Generative AI refers to AI models that can:",
    options: [
      "Only classify or label existing data points",
      "Generate novel content such as text, images, audio, or code",
      "Exclusively perform linear regression on tabular datasets",
      "Automatically delete corrupted or duplicate data",
    ],
  },
  {
    id: 11,
    text: "In the context of AI fairness, 'bias' refers to:",
    options: [
      "The slope coefficient in a linear regression model",
      "Systematic errors in model outputs that lead to unfair or skewed results",
      "A specific activation function used in deep neural networks",
      "A strategy for initialising neural network weights",
    ],
  },
  {
    id: 12,
    text: "The Turing Test was designed to evaluate:",
    options: [
      "The raw processing speed and clock rate of a computer",
      "Whether a machine can exhibit intelligent behaviour indistinguishable from a human",
      "Memory efficiency and cache hit ratios",
      "Error rates in image classification benchmarks",
    ],
  },
  {
    id: 13,
    text: "In Reinforcement Learning, an agent learns by:",
    options: [
      "Being provided with fully labelled training data",
      "Interacting with an environment and receiving rewards or penalties based on actions",
      "Clustering data points without any feedback signal",
      "Reading structured documentation and rule sets",
    ],
  },
  {
    id: 14,
    text: "Convolutional Neural Networks (CNNs) are primarily used for processing:",
    options: [
      "Sequential text and conversational data",
      "Flat tabular numerical datasets",
      "Image, visual, and spatial data",
      "Audio-only waveform signals",
    ],
  },
  {
    id: 15,
    text: "Transfer Learning enables you to:",
    options: [
      "Move trained model weights between incompatible programming languages",
      "Reuse a model trained on one task as a starting point for a different task",
      "Transfer datasets seamlessly between different cloud storage providers",
      "Combine two separate loss functions into a single unified objective",
    ],
  },
  {
    id: 16,
    text: "Which of the following is an example of unsupervised learning?",
    options: [
      "Classifying emails as spam or not spam",
      "K-Means Clustering to group similar customers",
      "A decision tree used for loan approval decisions",
      "YOLO-based real-time object detection",
    ],
  },
  {
    id: 17,
    text: "Prompt Engineering involves:",
    options: [
      "Writing low-level system kernel prompts for operating systems",
      "Crafting and optimising inputs to guide large language model outputs effectively",
      "Engineering specialised hardware accelerators for faster AI inference",
      "Compiling and optimising machine learning model computation graphs",
    ],
  },
  {
    id: 18,
    text: "Large Language Models (LLMs) are typically pre-trained on:",
    options: [
      "Small, highly curated datasets of around 10,000 carefully selected samples",
      "Vast amounts of diverse text data sourced from the internet and books",
      "Only peer-reviewed academic research papers and journals",
      "Audio recordings that are automatically transcribed to text",
    ],
  },
  {
    id: 19,
    text: "Which ethical concern is most prominently associated with facial recognition AI?",
    options: [
      "Excessively high energy consumption in data centres",
      "Privacy violations and potential abuse for mass surveillance",
      "Below-average inference speed compared to other models",
      "Inability to function in indoor lighting conditions",
    ],
  },
  {
    id: 20,
    text: "Which organisation developed the widely-used GPT series of models and is known for safety-focused AI research?",
    options: [
      "Meta AI (Fundamental AI Research)",
      "Google DeepMind",
      "OpenAI",
      "IBM Research",
    ],
  },
];

export default function CandidateExamPage() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  // phases: "assigned" | "setup" | "testing" | "done"
  const [phase, setPhase] = useState("assigned");
  const [session, setSession] = useState(null);
  const [score, setScore] = useState(100);
  const [answers, setAnswers] = useState(Array(20).fill(null));
  const [currentQ, setCurrentQ] = useState(0);
  const [cameraStream, setCameraStream] = useState(null);
  const [permCamera, setPermCamera] = useState(false);
  const [permMic, setPermMic] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [startError, setStartError] = useState("");
  const [completionReason, setCompletionReason] = useState("submitted");
  const [elapsed, setElapsed] = useState(0);
  const [permRetry, setPermRetry] = useState(0);

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const didTerminateForScoreRef = useRef(false);
  const { attachStream, startCapture, markIncident } = useIncidentRecorder();

  const ingestEvent = useCallback(
    (event) =>
      new Promise((resolve, reject) => {
        if (!session?._id || !socketRef.current) {
          reject(new Error("session-socket-unavailable"));
          return;
        }

        socketRef.current.timeout(5000).emit(
          "event:ingest",
          {
            sessionId: session._id,
            event,
          },
          (error, payload) => {
            if (error) {
              reject(new Error("Event ingest timed out"));
              return;
            }

            if (payload?.error) {
              reject(new Error(payload.error));
              return;
            }

            resolve(payload);
          },
        );
      }),
    [session?._id],
  );

  const active = phase === "testing";

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || user?.role !== "candidate") {
      navigate("/candidate/login");
      return;
    }
    setCandidate(user);
  }, [navigate]);

  // ── Request camera + mic when entering setup ───────────────────────────────
  useEffect(() => {
    if (phase !== "setup") return;
    let cancelled = false;
    setSetupError("");
    setPermCamera(false);
    setPermMic(false);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setCameraStream(stream);
        await attachStream(stream);
        setPermCamera(true);
        setPermMic(true);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera and microphone access was denied. Allow access in your browser settings, then click Retry."
            : err.message || "Failed to access camera/microphone.";
        setSetupError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, permRetry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync video element whenever stream or phase changes ───────────────────
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, phase]);

  // ── Exam timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "testing") return;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Auto-submit on time up ────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "testing" && elapsed >= DURATION_SECS) finishTest();
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (
      phase === "testing" &&
      score < TERMINATION_SCORE_THRESHOLD &&
      !didTerminateForScoreRef.current
    ) {
      didTerminateForScoreRef.current = true;
      finishTest("terminated_low_integrity");
    }
  }, [phase, score]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pushEvent = useCallback(
    async (ev) => {
      const fullEvent = { ...ev, timestamp: new Date().toISOString() };
      const shouldCaptureEvidence = Boolean(session?._id);
      const evidenceCapture = shouldCaptureEvidence ? startCapture(5) : null;

      try {
        const payload = await ingestEvent(fullEvent);

        if (shouldCaptureEvidence && payload?.event?._id && evidenceCapture) {
          void markIncident({
            eventType: ev.eventType,
            sessionId: session?._id,
            eventId: payload.event._id,
            durationSec: 5,
            capture: evidenceCapture,
          }).then((result) => {
            if (!result?.ok) {
              console.warn("Evidence capture/upload failed", result);
            }
          });
        }
      } catch (error) {
        console.warn("Failed to process suspicious event", error);
      }
    },
    [ingestEvent, markIncident, session?._id, startCapture],
  );

  useBrowserGuards(active, pushEvent);
  useAudioMonitor(active, pushEvent);
  useVisionMonitor({ enabled: active, videoRef, onEvent: pushEvent });
  useYoloMonitor({
    enabled: active,
    videoRef,
    sessionId: session?._id,
    onEvent: pushEvent,
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  async function startTest() {
    setStartError("");
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        // Must be triggered directly in user gesture path.
        await document.documentElement.requestFullscreen().catch(() => {});
      }

      const sessionDoc = await startSession(EXAM_ID, {
        candidate: {
          name: candidate?.name || "Candidate",
          email: candidate?.email,
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
      setScore(sessionDoc.currentScore ?? 100);

      const socket = await createSocket();
      socketRef.current = socket;
      socket.emit("session:join", { sessionId: sessionDoc._id });
      socket.on("score:update", (payload) => {
        if (payload.sessionId !== sessionDoc._id) return;
        setScore(payload.score);
        if (payload.sessionStatus === "terminated") {
          didTerminateForScoreRef.current = true;
          finishTest("terminated_low_integrity");
        }
      });

      setPhase("testing");
      didTerminateForScoreRef.current = false;
    } catch (err) {
      setStartError(err.message || "Failed to start test. Please try again.");
    }
  }

  async function finishTest(reason = "submitted") {
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setCompletionReason(reason);
    setPhase("done");
  }

  function selectAnswer(qIdx, optIdx) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  function formatTimeLeft() {
    const remaining = Math.max(0, DURATION_SECS - elapsed);
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  const answered = answers.filter((a) => a !== null).length;
  const isLowTime = DURATION_SECS - elapsed <= 300;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: assigned — test assignment card
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "assigned") {
    return (
      <div className="page-wrap assigned-shell">
        <div className="assigned-card">
          <span className="test-badge">New Test Assigned</span>
          <h1 style={{ margin: "0.3rem 0 0.6rem" }}>{EXAM_NAME}</h1>
          <p style={{ color: "#5b6268", marginBottom: "0.3rem" }}>
            Exam ID: <strong>{EXAM_ID}</strong>
          </p>
          <p style={{ marginBottom: "1.2rem" }}>
            Welcome, <strong>{candidate?.name || "Candidate"}</strong>. You have
            been assigned a new qualifying test. The exam contains{" "}
            <strong>20 questions</strong> and must be completed within{" "}
            <strong>45 minutes</strong>. Your activity will be monitored
            throughout the session.
          </p>
          <ul
            style={{
              paddingLeft: "1.2rem",
              marginBottom: "1.6rem",
              lineHeight: "2",
            }}
          >
            <li>Ensure you are in a quiet, well-lit environment.</li>
            <li>Do not switch tabs or open other applications.</li>
            <li>Keep your face visible in the camera at all times.</li>
            <li>No physical books or mobile phones are allowed.</li>
          </ul>
          <button
            style={{ fontSize: "1rem", padding: "0.65rem 1.8rem" }}
            onClick={() => setPhase("setup")}
          >
            Enter Test →
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: setup — permissions & environment check
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "setup") {
    return (
      <div className="page-wrap setup-shell">
        <div className="setup-card">
          <h2 style={{ marginTop: 0 }}>Setting Up Your Environment</h2>
          <p style={{ color: "#5b6268", marginBottom: "1rem" }}>
            {EXAM_NAME}&nbsp;·&nbsp;{EXAM_ID}
          </p>

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="video-preview"
            style={{ marginBottom: "1rem" }}
          />

          <ul className="checklist">
            <li>
              <span className="check-icon">
                {permCamera ? "✅" : setupError ? "❌" : "⏳"}
              </span>
              Camera Access&nbsp;
              {permCamera ? "granted" : setupError ? "denied" : "requesting…"}
            </li>
            <li>
              <span className="check-icon">
                {permMic ? "✅" : setupError ? "❌" : "⏳"}
              </span>
              Microphone Access&nbsp;
              {permMic ? "granted" : setupError ? "denied" : "requesting…"}
            </li>
            <li>
              <span className="check-icon">✅</span>
              Full-Screen Support available
            </li>
          </ul>

          {setupError && (
            <p style={{ color: "var(--danger)", fontSize: "0.88rem" }}>
              {setupError}
            </p>
          )}
          {startError && (
            <p style={{ color: "var(--danger)", fontSize: "0.88rem" }}>
              {startError}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              marginTop: "1.2rem",
              flexWrap: "wrap",
            }}
          >
            {setupError && (
              <button
                className="secondary"
                onClick={() => setPermRetry((n) => n + 1)}
              >
                Retry Permissions
              </button>
            )}
            <button
              disabled={!permCamera || !permMic}
              style={{
                opacity: permCamera && permMic ? 1 : 0.45,
                cursor: permCamera && permMic ? "pointer" : "not-allowed",
              }}
              onClick={startTest}
            >
              Start Test
            </button>
            <button
              className="secondary"
              onClick={() => {
                if (cameraStream)
                  cameraStream.getTracks().forEach((t) => t.stop());
                setCameraStream(null);
                clearAuthSession();
                navigate("/candidate/login");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: done — completion card
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "done") {
    return (
      <div className="page-wrap done-shell">
        <div className="done-card">
          <div className="done-icon">🎉</div>
          <h2>
            {completionReason === "terminated_low_integrity"
              ? "Test Terminated"
              : completionReason === "exited"
                ? "Test Exited"
                : "Test Submitted Successfully"}
          </h2>
          <p>
            Thank you, <strong>{candidate?.name || "Candidate"}</strong>. Your
            {completionReason === "terminated_low_integrity"
              ? " session was auto-terminated because your integrity score dropped below 40."
              : completionReason === "exited"
                ? " test session was exited early."
                : " responses have been recorded."}
          </p>
          <p>
            Questions answered: <strong>{answered} / 20</strong>
          </p>
          <p style={{ color: "#5b6268", fontSize: "0.88rem" }}>
            Your integrity score and detailed report will be available in the
            Admin Portal shortly.
          </p>
          <button
            style={{ marginTop: "1.2rem" }}
            onClick={() => {
              clearAuthSession();
              navigate("/");
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: testing — full-screen exam interface
  // ═══════════════════════════════════════════════════════════════════════════
  const q = QUESTIONS[currentQ];

  return (
    <div className="exam-shell">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="exam-topbar">
        <h2>{EXAM_NAME}</h2>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "#8b949e" }}>
            {answered} / 20 answered
          </span>
          <button
            className="exam-submit-btn"
            onClick={finishTest}
            style={{ fontSize: "0.85rem", padding: "0.35rem 0.9rem" }}
          >
            Submit &amp; Finish
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="exam-body">
        {/* Questions panel */}
        <div className="exam-questions">
          <div className="question-card-wrapper">
            <div className="question-card">
              <div className="question-meta">
                Question {currentQ + 1} of {QUESTIONS.length}
              </div>
              <div className="question-text">{q.text}</div>
              <div className="options-grid">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`option-btn${answers[currentQ] === i ? " selected" : ""}`}
                    onClick={() => selectAnswer(currentQ, i)}
                  >
                    <span
                      style={{
                        marginRight: "0.5rem",
                        fontWeight: 700,
                        opacity: 0.55,
                      }}
                    >
                      {["A", "B", "C", "D"][i]}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              <div className="exam-nav">
                <button
                  className="exam-nav-btn secondary"
                  onClick={() => setCurrentQ((n) => Math.max(0, n - 1))}
                  disabled={currentQ === 0}
                >
                  Previous
                </button>

                <button
                  className="exam-submit-btn"
                  onClick={() => {
                    if (
                      window.confirm("Are you sure you want to save & exit?")
                    ) {
                      finishTest("submitted");
                    }
                  }}
                >
                  Save &amp; Exit
                </button>

                <button
                  className="exam-nav-btn secondary"
                  onClick={() =>
                    setCurrentQ((n) => Math.min(QUESTIONS.length - 1, n + 1))
                  }
                  disabled={currentQ === QUESTIONS.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="exam-sidebar">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="cam-preview"
          />

          <div
            className="timer-pill"
            style={{ color: isLowTime ? "#f85149" : "#3fb950" }}
          >
            ⏱ {formatTimeLeft()}
          </div>

          <div className="score-badge">
            <div
              style={{
                fontSize: "0.72rem",
                color: "#8b949e",
                marginBottom: "0.3rem",
              }}
            >
              Trust Score
            </div>
            <TrustMeter score={score} />
          </div>

          <div
            style={{
              fontSize: "0.72rem",
              color: "#8b949e",
              marginBottom: "0.2rem",
            }}
          >
            Questions
          </div>
          <div className="q-grid">
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                className={`q-dot${answers[i] !== null ? " answered" : ""}${i === currentQ ? " current" : ""}`}
                onClick={() => setCurrentQ(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
