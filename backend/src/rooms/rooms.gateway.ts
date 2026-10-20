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
  private live = new Map<string, Map<string, { content: string; revision: number }>>();
  private focusState = new Map<string, { fileId: string | null; lineNumber?: number; column?: number }>();
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
      // Unirse recupera el contenido aún no persistido por el profesor.
      const overlay = this.live.get(room.id);
      if (overlay) for (const node of room.project.nodes) {
        const live = overlay.get(node.id);
        if (live) node.content = live.content;
      }
      client.data.roomId = room.id;
      client.data.role = teacher ? 'teacher' : 'student';
      let participants = this.members.get(room.id);
      if (!participants) { participants = new Map(); this.members.set(room.id, participants); }
      participants.set(client.id, { name, role: client.data.role });
      this.server.to(room.id).emit('room:participants', [...participants.values()]);
      return { ok: true, project: room.project, focus: this.focusState.get(room.id) ?? null, revisions: Object.fromEntries([...(overlay?.entries() ?? [])].map(([id, value]) => [id, value.revision])) };
    } catch { throw new WsException('Room access denied'); }
  }
  @SubscribeMessage('teacher:focus')
  focus(@ConnectedSocket() client: Socket, @MessageBody() body: { fileId: string | null }) {
    if (!client.data.roomId || client.data.role !== 'teacher') throw new WsException('Teacher only');
    if (body?.fileId !== null && typeof body?.fileId !== 'string') throw new WsException('Invalid file');
    this.focusState.set(client.data.roomId, { fileId: body.fileId });
    this.server.to(client.data.roomId).emit('teacher:focus', { fileId: body.fileId });
  }
  // Operaciones incrementales basadas en offsets UTF-16 de Monaco.
  @SubscribeMessage('teacher:edit')
  async edit(@ConnectedSocket() client: Socket, @MessageBody() body: { fileId: string; baseRevision: number; changes: { rangeOffset: number; rangeLength: number; text: string }[] }) {
    const roomId = client.data.roomId as string | undefined;
    if (!roomId || client.data.role !== 'teacher') throw new WsException('Teacher only');
    const room = await this.db.room.findUnique({ where: { id: roomId }, select: { active: true, projectId: true } });
    if (!room?.active) throw new WsException('Room closed');
    if (!body || typeof body.fileId !== 'string' || !Array.isArray(body.changes) || body.changes.length > 100) throw new WsException('Invalid edit');
    const node = await this.db.projectNode.findFirst({ where: { id: body.fileId, projectId: room.projectId, kind: 'FILE' } });
    if (!node) throw new WsException('Invalid file');
    let overlay = this.live.get(roomId);
    if (!overlay) { overlay = new Map(); this.live.set(roomId, overlay); }
    const previous = overlay.get(node.id) ?? { content: node.content ?? '', revision: 0 };
    if (body.baseRevision !== previous.revision) return { ok: false, revision: previous.revision, content: previous.content };
    let content = previous.content;
    const changes = [...body.changes].sort((a,b) => b.rangeOffset - a.rangeOffset);
    for (const c of changes) {
      if (!Number.isSafeInteger(c.rangeOffset) || !Number.isSafeInteger(c.rangeLength) || c.rangeOffset < 0 || c.rangeLength < 0 || c.rangeOffset + c.rangeLength > content.length || typeof c.text !== 'string' || c.text.length > 100000) throw new WsException('Invalid change');
      content = content.slice(0, c.rangeOffset) + c.text + content.slice(c.rangeOffset + c.rangeLength);
    }
    if (content.length > 2_000_000) throw new WsException('File too large');
    const revision = previous.revision + 1;
    overlay.set(node.id, { content, revision });
    client.to(roomId).emit('teacher:edit', { fileId: node.id, changes, revision });
    return { ok: true, revision };
  }

  @SubscribeMessage('teacher:cursor')
  cursor(@ConnectedSocket() client: Socket, @MessageBody() body: { fileId: string; lineNumber: number; column: number }) {
    const roomId = client.data.roomId as string | undefined;
    if (!roomId || client.data.role !== 'teacher') throw new WsException('Teacher only');
    if (!body || typeof body.fileId !== 'string' || !Number.isInteger(body.lineNumber) || !Number.isInteger(body.column) || body.lineNumber < 1 || body.column < 1) return;
    const state = { fileId: body.fileId, lineNumber: body.lineNumber, column: body.column };
    this.focusState.set(roomId, state);
    client.to(roomId).emit('teacher:cursor', state);
  }

  // Snapshot autoritativo para recuperar cambios perdidos sin reiniciar la sala.
  @SubscribeMessage('room:sync')
  async sync(@ConnectedSocket() client: Socket, @MessageBody() body: { fileId: string }) {
    const roomId = client.data.roomId as string | undefined;
    if (!roomId || typeof body?.fileId !== 'string') throw new WsException('Not authorized');
    const room = await this.db.room.findUnique({ where: { id: roomId }, select: { active: true, projectId: true } });
    if (!room?.active) throw new WsException('Room closed');
    const node = await this.db.projectNode.findFirst({ where: { id: body.fileId, projectId: room.projectId, kind: 'FILE' } });
    if (!node) throw new WsException('Invalid file');
    const state = this.live.get(roomId)?.get(node.id);
    return { ok: true, fileId: node.id, content: state?.content ?? node.content ?? '', revision: state?.revision ?? 0 };
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
