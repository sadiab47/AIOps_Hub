import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string;
  email: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(private jwtService: JwtService) {}

  async generateAccess(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '15m' });
  }

  async generateRefresh(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '30d' });
  }

  async verify(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token);
  }
}
