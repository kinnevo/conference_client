import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './session';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
      auth: {
        token: getAccessToken()
      }
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  // Update auth token before connecting
  s.auth = { token: getAccessToken() };
  s.connect();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}
