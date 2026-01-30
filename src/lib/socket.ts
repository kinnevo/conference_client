import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
      auth: {
        token: Cookies.get('accessToken')
      }
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  s.auth = { token: Cookies.get('accessToken') };
  s.connect();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}
