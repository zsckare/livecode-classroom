import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({ data: { name: dto.name.trim(), email, passwordHash } });
      return this.issue(user);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Email already registered');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user);
  }

  async me(token?: string) {
    if (!token) throw new UnauthorizedException();
    let payload: { sub: string };
    try { payload = await this.jwt.verifyAsync<{ sub: string }>(token); }
    catch { throw new UnauthorizedException(); }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  private async issue(user: { id: string; name: string; email: string }) {
    return { user: this.publicUser(user), token: await this.jwt.signAsync({ sub: user.id }) };
  }

  private publicUser(user: { id: string; name: string; email: string }) {
    return { id: user.id, name: user.name, email: user.email };
  }
}
