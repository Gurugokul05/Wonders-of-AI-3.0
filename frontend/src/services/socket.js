import { io } from "socket.io-client";
import { getToken } from "./auth";

const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || "http://localhost:5000";

export function createSocket() {
  return io(SOCKET_BASE, {
    transports: ["websocket"],
    auth: {
      token: getToken(),
    },
  });
}
