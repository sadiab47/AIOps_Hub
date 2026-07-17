import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  sub: string;
  email: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return data && user ? user[data] : user;
  },
);
