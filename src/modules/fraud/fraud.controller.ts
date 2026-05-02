import { Controller, Get, Patch, Body, UseGuards, BadRequestException, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { FraudService } from './fraud.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReviewFlagDto } from './dto/review-flag.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FraudFlagResponseDto } from './dto/fraud-flag-response.dto';
import { PaginatedFraudFlagsResponseDto } from './dto/paginated-fraud-flags-response.dto';

@ApiTags('Fraud')
@Controller('fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class FraudController {
  constructor(private readonly fraud: FraudService) {}

  // Admin-only: list flags
  @Get('flags')
  @ApiOperation({ summary: 'List fraud flags (admin)' })
  @ApiResponse({ status: 200, description: 'List of fraud flags', type: wrapResponse(PaginatedFraudFlagsResponseDto) })
  async listFlags(@Query() query: ListQueryDto) {
    const opts: any = {};
    if (query.page) opts.page = query.page;
    if (query.limit) opts.limit = query.limit;
    if (query.search) opts.status = query.search;
    if (query.sortBy) opts.sortBy = query.sortBy;
    if (query.sortOrder) opts.sortOrder = query.sortOrder;
    return this.fraud.listFlags(opts);
  }

  @Patch('flags/:id')
  @ApiOperation({ summary: 'Review a fraud flag (admin)' })
  @ApiBody({ type: ReviewFlagDto })
  @ApiResponse({ status: 200, description: 'Flag reviewed', type: wrapResponse(FraudFlagResponseDto) })
  async reviewFlag(@Param('id') id: string, @Body() dto: ReviewFlagDto, @CurrentUser() user: { id: string }) {
    try {
      const status = dto.status ?? 'REVIEWED';
      const updated = await this.fraud.reviewFlag(id, user.id, status, dto.metadata);
      return updated;
    } catch (err) {
      throw new BadRequestException((err as any)?.message || 'Failed to review flag');
    }
  }
}
