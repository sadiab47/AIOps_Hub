import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';

describe('Authentication Integration Tests (AUTH-003)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    testEmail = `integration-rtr-${Date.now()}@example.com`;
  });

  afterAll(async () => {
    if (prisma) {
      // Teardown: Delete mock user and its related sessions/audits
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      if (user) {
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('should flow through Register -> Login -> Refresh -> Block Reuse', async () => {
    // 1. Register a new user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'RTR Tester',
      })
      .expect(201);

    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.email).toBe(testEmail);

    // 2. Login to generate session cookies
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .expect(200);

    expect(loginRes.body.success).toBe(true);

    const loginCookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(loginCookies).toBeDefined();
    
    // Find access and refresh token cookies
    const accessTokenCookie = loginCookies.find((c) => c.startsWith('aiops_access_token='));
    const refreshTokenCookie = loginCookies.find((c) => c.startsWith('aiops_refresh_token='));

    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    const initialRefreshTokenValue = refreshTokenCookie!.split(';')[0];

    // Wait slightly to ensure token timestamps are different
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 3. First Refresh - Rotates cookies and returns success
    const refreshRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [initialRefreshTokenValue])
      .expect(200);

    expect(refreshRes1.body.success).toBe(true);

    const refreshCookies1 = refreshRes1.headers['set-cookie'] as unknown as string[];
    expect(refreshCookies1).toBeDefined();

    const accessCookieRotated1 = refreshCookies1.find((c) => c.startsWith('aiops_access_token='));
    const refreshCookieRotated1 = refreshCookies1.find((c) => c.startsWith('aiops_refresh_token='));

    expect(accessCookieRotated1).toBeDefined();
    expect(refreshCookieRotated1).toBeDefined();

    const rotatedRefreshTokenValue1 = refreshCookieRotated1!.split(';')[0];

    // Ensure rotated refresh token is different from original
    expect(rotatedRefreshTokenValue1).not.toBe(initialRefreshTokenValue);

    // 4. Reuse Detection - Refreshing with the old refresh token must trigger 401 and revoke all sessions
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [initialRefreshTokenValue])
      .expect(401);

    // 5. Subsequent Refresh with the previously valid rotated token must now ALSO fail because all user sessions were revoked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [rotatedRefreshTokenValue1])
      .expect(401);
  });
});
