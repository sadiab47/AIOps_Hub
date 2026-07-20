import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.aiops_access_token;

    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      const payload = await this.tokenService.verify(token);
      request.context = {
        ...request.context,
        userId: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
      };
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
