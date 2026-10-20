import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../common/prisma.service';
import { RoomEventsService } from './room-events.service';

// Cada socket debe demostrar que es profesor propietario o alumno invitado.
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true } })
@Injectable()
export class RoomsGateway implements OnModuleInit {
  @WebSocketServer() server!: Server;
  private members = new Map<string, Map<string, { name: string; role: string }>>();
  constructor(private readonly jwt: JwtService, private readonly db: PrismaService, private readonly events: RoomEventsService) {}
  onModuleInit() {
    this.events.changes.subscribe(async event => {
      const rooms = await this.db.room.findMany({ where: { projectId: event.projectId, active: true }, select: { id: true } });
      for (const room of rooms) this.server.to(room.id).emit('project:changed', { type: event.type, payload: event.payload });
    });
  }
  @SubscribeMessage('room:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string; token?: string }) {
    try {
      const token = body?.token || /(?:^|; )livecode_session=([^;]+)/.exec(client.handshake.headers.cookie ?? '')?.[1];
      if (!token || !body?.roomId) throw new Error('Missing credentials');
      const payload = await this.jwt.verifyAsync<{ sub?: string; role?: string; roomId?: string; name?: string }>(token);
      const room = await this.db.room.findUnique({ where: { id: body.roomId }, include: { project: { include: { nodes: true } } } });
      if (!room?.active) throw new Error('Room closed');
      const teacher = !!payload.sub && payload.sub === room.ownerId;
      const student = payload.role === 'student' && payload.roomId === room.id;
      if (!teacher && !student) throw new Error('Not authorized');
      const name = teacher ? 'Profesor' : payload.name ?? 'Alumno';
      const previous = client.data.roomId as string | undefined;
      if (previous) this.leave(client);
      client.join(room.id);
      client.data.roomId = room.id;
      client.data.role = teacher ? 'teacher' : 'student';
      let participants = this.members.get(room.id);
      if (!participants) { participants = new Map(); this.members.set(room.id, participants); }
      participants.set(client.id, { name, role: client.data.role });
      this.server.to(room.id).emit('room:participants', [...participants.values()]);
      return { ok: true, project: room.project };
    } catch { throw new WsException('Room access denied'); }
  }
  @SubscribeMessage('teacher:focus')
  focus(@ConnectedSocket() client: Socket, @MessageBody() body: { fileId: string | null }) {
    if (!client.data.roomId || client.data.role !== 'teacher') throw new WsException('Teacher only');
    if (body?.fileId !== null && typeof body?.fileId !== 'string') throw new WsException('Invalid file');
    this.server.to(client.data.roomId).emit('teacher:focus', { fileId: body.fileId });
  }
  handleDisconnect(client: Socket) { this.leave(client); }
  private leave(client: Socket) {
    const roomId = client.data.roomId as string | undefined;
    if (!roomId) return;
    this.members.get(roomId)?.delete(client.id);
    const participants = this.members.get(roomId);
    if (participants?.size === 0) this.members.delete(roomId);
    this.server.to(roomId).emit('room:participants', [...(participants?.values() ?? [])]);
    client.leave(roomId);
    delete client.data.roomId;
  }
}
