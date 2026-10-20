import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { ProjectsService } from './projects.service';

class NameDto { @IsString() @MinLength(1) @MaxLength(120) name!: string; }
class CreateNodeDto extends NameDto {
  @IsIn(['FILE', 'FOLDER']) kind!: 'FILE' | 'FOLDER';
  @IsOptional() @IsUUID() parentId?: string;
}
class UpdateNodeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000000) content?: string;
  @IsOptional() @IsUUID() parentId?: string;
}
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService, private readonly auth: AuthService) {}
  private async userId(req: Request): Promise<string> {
    const user = await this.auth.me(req.cookies?.livecode_session);
    if (!user?.id) throw new UnauthorizedException();
    return user.id;
  }
  @Get() list(@Req() req: Request) { return this.userId(req).then(id => this.projects.list(id)); }
  @Post() create(@Req() req: Request, @Body() body: NameDto) { return this.userId(req).then(id => this.projects.create(id, body.name)); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.userId(req).then(uid => this.projects.get(uid, id)); }
  @Patch(':id') rename(@Req() req: Request, @Param('id') id: string, @Body() body: NameDto) { return this.userId(req).then(uid => this.projects.rename(uid, id, body.name)); }
  @Delete(':id') remove(@Req() req: Request, @Param('id') id: string) { return this.userId(req).then(uid => this.projects.remove(uid, id)); }
  @Post(':id/nodes') createNode(@Req() req: Request, @Param('id') id: string, @Body() body: CreateNodeDto) { return this.userId(req).then(uid => this.projects.createNode(uid, id, body)); }
  @Patch(':id/nodes/:nodeId') updateNode(@Req() req: Request, @Param('id') id: string, @Param('nodeId') nodeId: string, @Body() body: UpdateNodeDto) {
    if (Object.keys(body).length === 0) throw new BadRequestException('No changes provided');
    return this.userId(req).then(uid => this.projects.updateNode(uid, id, nodeId, body));
  }
  @Delete(':id/nodes/:nodeId') removeNode(@Req() req: Request, @Param('id') id: string, @Param('nodeId') nodeId: string) { return this.userId(req).then(uid => this.projects.removeNode(uid, id, nodeId)); }
}
