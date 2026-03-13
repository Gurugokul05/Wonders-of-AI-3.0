import { io } from "socket.io-client";

import { getToken } from "./auth";
import { resolveBackendOrigin } from "./runtimeBackend";

export async function createSocket() {
  const socketBase = await resolveBackendOrigin();
  return io(socketBase, {
    transports: ["websocket"],
    auth: {
      token: getToken(),
    },
  });
}
