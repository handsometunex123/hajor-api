import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ maxLength: 2000, example: 'Hello, I would like to join this group' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
