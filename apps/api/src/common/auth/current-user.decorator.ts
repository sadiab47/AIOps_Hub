import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  sub: string;
  email: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context = request.context || {};

    if (data === 'sub' || data === 'userId') {
      return context.userId;
    }
    if (data === 'sessionId') {
      return context.sessionId;
    }
    return data ? context[data as keyof typeof context] : context;
  },
);
