import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty({ description: 'JWT Bearer access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token!: string;

  @ApiProperty({
    description: 'When true the user must call POST /auth/change-password before using the app. Set for proxy users on first login.',
    example: false,
  })
  mustChangePassword!: boolean;
}
