const ExamSession = require("../models/ExamSession");
const { applyEventToSession } = require("../services/scoringEngine");
const { verifyToken } = require("../services/authService");

function registerProctoringSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      socket.user = verifyToken(token);
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("session:join", ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(`session:${sessionId}`);
    });

    socket.on("admin:join", ({ examId }) => {
      if (!examId) return;
      if (socket.user?.role !== "admin") return;
      socket.join(`exam:${examId}`);
    });

    socket.on("event:ingest", async ({ sessionId, event }) => {
      if (!sessionId || !event) return;

      const session = await ExamSession.findById(sessionId);
      if (!session) return;

      const result = await applyEventToSession(session, event);
      const payload = {
        sessionId,
        score: result.score,
        riskLevel: result.riskLevel,
        event: result.event,
        sessionStatus: result.sessionStatus,
        terminated: result.terminated,
        terminationThreshold: result.terminationThreshold,
      };

      io.to(`session:${sessionId}`).emit("score:update", payload);
      io.to(`exam:${session.examId}`).emit("admin:session:update", payload);
    });
  });
}

module.exports = { registerProctoringSocket };
