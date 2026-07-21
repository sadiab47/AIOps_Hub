import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiCookieAuth } from '@nestjs/swagger';

export function ApiTenantHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'x-organization-id',
      description: 'Active Organization UUID context header required for multi-tenant endpoints',
      required: false,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiCookieAuth('aiops_access_token'),
  );
}
