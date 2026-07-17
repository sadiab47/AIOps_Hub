import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';

describe('Authentication Integration Tests (AUTH-004)', () => {
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
    testEmail = `integration-logout-${Date.now()}@example.com`;
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

  it('should support register and login', async () => {
    // Register
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Logout Tester',
      })
      .expect(201);
  });

  it('should log out current session and verify refresh is blocked, checking idempotency', async () => {
    // 1. Login to get a session
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .expect(200);

    const loginCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = loginCookies.find((c) => c.startsWith('aiops_refresh_token='));
    expect(refreshCookie).toBeDefined();

    const refreshTokenValue = refreshCookie!.split(';')[0];

    // 2. Logout - Clear cookies, return standard success message
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', [refreshTokenValue])
      .expect(200);

    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.message).toBe('Logged out successfully.');

    // Assert Set-Cookie contains empty/deleted values
    const logoutCookies = logoutRes.headers['set-cookie'] as unknown as string[];
    expect(logoutCookies.some((c) => c.includes('aiops_refresh_token=;'))).toBe(true);

    // 3. Verify refresh with the logged out token is rejected
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshTokenValue])
      .expect(401);

    // 4. Verify logout is idempotent (calling logout again on invalid token still returns 200)
    const logoutResIdempotent = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', [refreshTokenValue])
      .expect(200);

    expect(logoutResIdempotent.body.success).toBe(true);
  });

  it('should support multi-device logins and verify logout-all invalidates everything', async () => {
    // 1. Establish session A (Device A)
    const loginResA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .set('User-Agent', 'Device-A')
      .expect(200);

    const cookieA = (loginResA.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('aiops_refresh_token='))!.split(';')[0];

    // 2. Establish session B (Device B)
    const loginResB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .set('User-Agent', 'Device-B')
      .expect(200);

    const cookieB = (loginResB.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('aiops_refresh_token='))!.split(';')[0];

    // 3. Logout All from Device A
    const logoutAllRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Cookie', [cookieA])
      .expect(200);

    expect(logoutAllRes.body.success).toBe(true);
    expect(logoutAllRes.body.message).toBe('All sessions logged out successfully.');

    // 4. Verify BOTH Device A and Device B refreshes are blocked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookieA])
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookieB])
      .expect(401);
  });

  it('should revoke only current session on single logout and preserve other device sessions', async () => {
    // 1. Establish Device A session
    const loginResA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .set('User-Agent', 'Device-A')
      .expect(200);

    const cookieA = (loginResA.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('aiops_refresh_token='))!.split(';')[0];

    // 2. Establish Device B session
    const loginResB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      })
      .set('User-Agent', 'Device-B')
      .expect(200);

    const cookieB = (loginResB.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('aiops_refresh_token='))!.split(';')[0];

    // 3. Single Logout Device A
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', [cookieA])
      .expect(200);

    // 4. Device A refresh is blocked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookieA])
      .expect(401);

    // 5. Device B refresh STILL WORKS (sessions are isolated!)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookieB])
      .expect(200);
  });
});
