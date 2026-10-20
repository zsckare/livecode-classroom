export type Room = { id: string; code: string; name: string; active: boolean; projectId: string };
export type Participant = { name: string; role: 'teacher' | 'student' };
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
