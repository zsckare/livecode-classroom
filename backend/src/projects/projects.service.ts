import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: PrismaService) {}
  private validName(value: string) {
    const name = value.trim();
    if (!name || name === '.' || name === '..' || /[\\/\x00-\x1f]/.test(name)) throw new BadRequestException('Invalid name');
    return name;
  }
  private async owned(ownerId: string, id: string) {
    const project = await this.db.project.findFirst({ where: { id, ownerId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
  list(ownerId: string) { return this.db.project.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }); }
  async create(ownerId: string, name: string) {
    return this.db.project.create({ data: { name: this.validName(name), ownerId, nodes: { create: [
      { name: 'src', kind: 'FOLDER' }, { name: 'README.md', kind: 'FILE', content: '# Welcome to your project\n' },
    ] } } });
  }
  async get(ownerId: string, id: string) {
    await this.owned(ownerId, id);
    return this.db.project.findUnique({ where: { id }, include: { nodes: { orderBy: [{ kind: 'asc' }, { name: 'asc' }] } } });
  }
  async rename(ownerId: string, id: string, name: string) {
    await this.owned(ownerId, id);
    return this.db.project.update({ where: { id }, data: { name: this.validName(name) } });
  }
  async remove(ownerId: string, id: string) {
    await this.owned(ownerId, id);
    await this.db.project.delete({ where: { id } });
    return { ok: true };
  }
  private async node(projectId: string, nodeId: string) {
    const node = await this.db.projectNode.findFirst({ where: { id: nodeId, projectId } });
    if (!node) throw new NotFoundException('Node not found');
    return node;
  }
  private async checkSibling(projectId: string, parentId: string | null, name: string, exceptId?: string) {
    const sibling = await this.db.projectNode.findFirst({ where: { projectId, parentId, name, ...(exceptId ? { id: { not: exceptId } } : {}) } });
    if (sibling) throw new ConflictException('A file or folder with that name already exists');
  }
  private async checkParent(projectId: string, parentId?: string | null) {
    if (!parentId) return;
    const parent = await this.node(projectId, parentId);
    if (parent.kind !== 'FOLDER') throw new BadRequestException('Parent must be a folder');
  }
  async createNode(ownerId: string, projectId: string, body: { name: string; kind: 'FILE' | 'FOLDER'; parentId?: string }) {
    await this.owned(ownerId, projectId);
    const name = this.validName(body.name);
    await this.checkParent(projectId, body.parentId);
    await this.checkSibling(projectId, body.parentId ?? null, name);
    return this.db.projectNode.create({ data: { projectId, name, kind: body.kind, parentId: body.parentId ?? null } });
  }
  async updateNode(ownerId: string, projectId: string, nodeId: string, body: { name?: string; content?: string; parentId?: string }) {
    await this.owned(ownerId, projectId);
    const current = await this.node(projectId, nodeId);
    if (body.content !== undefined && current.kind !== 'FILE') throw new BadRequestException('Folders have no content');
    const name = body.name === undefined ? current.name : this.validName(body.name);
    const parentId = body.parentId === undefined ? current.parentId : body.parentId;
    if (parentId === nodeId) throw new BadRequestException('Cannot move a folder into itself');
    await this.checkParent(projectId, parentId);
    if (body.parentId !== undefined) {
      let ancestor = parentId;
      while (ancestor) {
        if (ancestor === nodeId) throw new BadRequestException('Cannot move a folder into its descendant');
        ancestor = (await this.node(projectId, ancestor)).parentId;
      }
    }
    await this.checkSibling(projectId, parentId, name, nodeId);
    const result = await this.db.projectNode.update({ where: { id: nodeId }, data: { name, parentId, ...(body.content !== undefined ? { content: body.content } : {}) } });
    await this.db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    return result;
  }
  async removeNode(ownerId: string, projectId: string, nodeId: string) {
    await this.owned(ownerId, projectId);
    await this.node(projectId, nodeId);
    await this.db.projectNode.delete({ where: { id: nodeId } });
    return { ok: true };
  }
}
