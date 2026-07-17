import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { RefreshTokenRepositoryInterface } from './refresh-token-repository.interface';
import { RefreshToken, Prisma } from '@aiops-hub/db';

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
    });
  }

  async revoke(id: string, reason: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async revokeAllByUser(userId: string, reason: string): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { id },
    });
  }

  async updateTokenHash(id: string, tokenHash: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { tokenHash },
    });
  }
}
