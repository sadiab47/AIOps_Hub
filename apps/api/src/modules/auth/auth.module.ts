import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from './repositories/refresh-token-repository.interface';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { CommonAuthModule } from '../../common/auth/common-auth.module';

import { SessionService } from './services/session.service';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CommonAuthModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    {
      provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
      useClass: RefreshTokenRepository,
    },
  ],
})
export class AuthModule {}
