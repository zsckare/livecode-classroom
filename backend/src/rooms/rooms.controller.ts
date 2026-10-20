import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { IsString, IsUUID, Length } from 'class-validator';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { RoomsService } from './rooms.service';
class CreateRoomDto { @IsUUID() projectId!: string; @IsString() @Length(1, 120) name!: string; }
class JoinRoomDto { @IsString() @Length(6, 6) code!: string; @IsString() @Length(1, 60) name!: string; }
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService, private readonly auth: AuthService) {}
  private async owner(req: Request) { return (await this.auth.me(req.cookies?.livecode_session)).id; }
  @Get() async list(@Req() req: Request) { return this.rooms.list(await this.owner(req)); }
  @Post() async create(@Req() req: Request, @Body() dto: CreateRoomDto) { return this.rooms.create(await this.owner(req), dto.projectId, dto.name); }
  @Delete(':id') async close(@Req() req: Request, @Param('id') id: string) { return this.rooms.close(await this.owner(req), id); }
  @Post('join') join(@Body() dto: JoinRoomDto) { return this.rooms.join(dto.code, dto.name); }
}
