import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class InviteListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'ACCEPTED', 'REJECTED'], description: 'Filter by invite status' })
  @IsOptional()
  @IsString()
  status?: string;
}
