import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './common/prisma.service';
import { HealthController } from './common/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController, HealthController],
  providers: [AuthService, PrismaService],
})
export class AppModule {}
