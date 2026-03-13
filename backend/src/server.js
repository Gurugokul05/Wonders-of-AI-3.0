require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { connectDB } = require("./config/db");
const { registerProctoringSocket } = require("./sockets/proctoringSocket");

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
    },
  });

  registerProctoringSocket(io);

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    console.log(`[server] trust-meter backend running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("[server] bootstrap failure", error);
  process.exit(1);
});
