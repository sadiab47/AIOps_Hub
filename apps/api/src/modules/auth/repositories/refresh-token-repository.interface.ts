import { RefreshToken, Prisma } from '@aiops-hub/db';

export const REFRESH_TOKEN_REPOSITORY_TOKEN = 'RefreshTokenRepositoryInterface';

export interface RefreshTokenRepositoryInterface {
  create(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<RefreshToken>;
  revokeAllByUser(userId: string): Promise<Prisma.BatchPayload>;
  deleteExpired(): Promise<Prisma.BatchPayload>;
}
