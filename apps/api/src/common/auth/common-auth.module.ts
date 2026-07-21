import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { CookieService } from './cookie.service';
import { AuthorizationService } from './authorization.service';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    PasswordService,
    TokenService,
    CookieService,
    AuthorizationService,
    PermissionGuard,
  ],
  exports: [
    PasswordService,
    TokenService,
    CookieService,
    AuthorizationService,
    PermissionGuard,
    JwtModule,
  ],
})
export class CommonAuthModule {}

