import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { CookieService } from './cookie.service';

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
  providers: [PasswordService, TokenService, CookieService],
  exports: [PasswordService, TokenService, CookieService, JwtModule],
})
export class CommonAuthModule {}
