import { IsString, IsNotEmpty, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIndemnityFormDto {
  @ApiProperty({ example: 'I, [Admin Name], accept full liability for adding this user to the group.' })
  @IsString()
  @IsNotEmpty()
  attestationText: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  agreementAccepted: boolean;

  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  addedUserId: string;
}
