import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Bypass throttling in test mode to allow rapid integration test iterations
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return super.shouldSkip(context);
  }
}
