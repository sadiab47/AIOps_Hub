import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({ example: 'd3b07384-d113-4956-a57e-e11504938a12', description: 'Unique user ID' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'User display name', nullable: true })
  name!: string | null;

  @ApiProperty({ example: [], description: 'User organization memberships' })
  organizations!: any[];

  @ApiProperty({ example: [], description: 'User RBAC roles' })
  roles!: string[];
}
