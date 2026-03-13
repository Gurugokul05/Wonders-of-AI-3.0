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

  const preferredPort = Number(process.env.PORT || 5000);
  const maxPortAttempts = 10;

  await listenWithFallback(server, preferredPort, maxPortAttempts);
}

function listenWithFallback(server, startPort, maxAttempts) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryListen = (port) => {
      const onError = (error) => {
        server.off("listening", onListening);

        if (error.code === "EADDRINUSE" && attempts < maxAttempts - 1) {
          attempts += 1;
          const nextPort = port + 1;
          console.warn(
            `[server] port ${port} is in use. Retrying on ${nextPort}...`,
          );
          return tryListen(nextPort);
        }

        return reject(error);
      };

      const onListening = () => {
        server.off("error", onError);
        const address = server.address();
        const boundPort =
          typeof address === "object" ? address.port : startPort;
        console.log(
          `[server] trust-meter backend running on port ${boundPort}`,
        );
        resolve(boundPort);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port);
    };

    tryListen(startPort);
  });
}

bootstrap().catch((error) => {
  console.error("[server] bootstrap failure", error);
  process.exit(1);
});
