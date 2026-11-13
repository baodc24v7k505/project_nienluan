import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    if ((socket.auth as { token?: string }).token !== token) {
      socket.auth = { token };
      socket.disconnect().connect();
    } else if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
