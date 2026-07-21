import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseEnvelopeDto<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  data!: T;

  @ApiProperty({
    example: { timestamp: '2026-07-21T10:52:00.000Z' },
    required: false,
  })
  meta?: Record<string, any>;
}

export class ApiErrorDetailDto {
  @ApiProperty({ example: 'FORBIDDEN' })
  code!: string;

  @ApiProperty({ example: 'You do not have permission to perform this action' })
  message!: string;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ type: ApiErrorDetailDto })
  error!: ApiErrorDetailDto;

  @ApiProperty({ example: 'req-12345', required: false })
  requestId?: string;

  @ApiProperty({ example: '2026-07-21T10:52:00.000Z' })
  timestamp!: string;
}
