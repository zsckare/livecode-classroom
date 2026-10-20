import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}
  async create(ownerId: string, projectId: string, name: string) {
    const project = await this.db.project.findFirst({ where: { id: projectId, ownerId } });
    if (!project) throw new NotFoundException('Project not found');
    if (!name?.trim() || name.length > 120) throw new BadRequestException('Invalid room name');
    for (let i = 0; i < 6; i++) {
      const code = randomInt(100000, 1000000).toString();
      try { return await this.db.room.create({ data: { code, name: name.trim(), ownerId, projectId } }); }
      catch (e: any) { if (e?.code !== 'P2002') throw e; }
    }
    throw new BadRequestException('Could not allocate room code');
  }
  list(ownerId: string) { return this.db.room.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }); }
  async close(ownerId: string, id: string) {
    const room = await this.db.room.findFirst({ where: { id, ownerId } });
    if (!room) throw new NotFoundException('Room not found');
    return this.db.room.update({ where: { id }, data: { active: false } });
  }
  async getByCode(code: string) {
    const room = await this.db.room.findUnique({ where: { code }, include: { project: { include: { nodes: true } } } });
    if (!room || !room.active) throw new NotFoundException('Room not available');
    return room;
  }
  async join(code: string, name: string) {
    const room = await this.getByCode(code);
    const clean = name?.trim();
    if (!clean || clean.length > 60) throw new BadRequestException('Invalid student name');
    const token = await this.jwt.signAsync({ role: 'student', roomId: room.id, name: clean }, { expiresIn: '4h' });
    return { token, room: { id: room.id, code: room.code, name: room.name, project: room.project } };
  }
  async teacherRoom(ownerId: string, roomId: string) {
    const room = await this.db.room.findFirst({ where: { id: roomId, ownerId, active: true } });
    if (!room) throw new ForbiddenException('Not your active room');
    return room;
  }
}
