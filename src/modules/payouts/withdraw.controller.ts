import { Controller, Post, Body, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { CreateWithdrawDto } from './withdraw.dto';
import { WithdrawService } from './withdraw.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { ProcessedResponseDto } from '../../common/dto/processed-response.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';

@ApiTags('Withdrawals')
@Controller('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class WithdrawController {
  constructor(private readonly service: WithdrawService) {}

  @Post()
  @ApiOperation({ summary: 'Request a withdraw' })
  @ApiBody({ type: CreateWithdrawDto })
  @ApiResponse({ status: 200, description: 'Withdraw requested', type: wrapResponse(ProcessedResponseDto) })
  async create(@Req() req: Request, @Body() dto: CreateWithdrawDto) {
    const user = (req as any).user;
    if (!user || !user.id) throw new BadRequestException('Unauthenticated');
    return this.service.requestWithdraw(user.id, dto.amount, dto.recipient, dto.transactionPin, dto.note);
  }

  @Post(':txId/confirmation')
  @ApiOperation({ summary: 'Confirm withdrawal with OTP' })
  @ApiBody({ schema: { properties: { otp: { type: 'string', example: '123456' } } } })
  @ApiResponse({ status: 200, description: 'Withdrawal confirmed or failed', type: wrapResponse(OkResponseDto) })
  async confirm(@Req() req: Request, @Param('txId') txId: string, @Body() body: { otp?: string }) {
    const user = (req as any).user;
    if (!user || !user.id) throw new BadRequestException('Unauthenticated');
    return this.service.confirmWithdraw(user.id, txId, body.otp);
  }
}
