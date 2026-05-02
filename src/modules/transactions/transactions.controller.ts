import { Body, Controller, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a raw transaction (admin/debug)' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({ status: 200, description: 'Transaction created', type: wrapResponse(TransactionResponseDto) })
  async create(@Body() dto: CreateTransactionDto) {
    try {
      const tx = await this.transactions.createTransaction({
        walletId: dto.walletId,
        type: dto.type,
        amount: dto.amount,
        reference: dto.reference,
        metadata: dto.metadata,
      });
      return { id: tx.id, reference: tx.reference, status: tx.status };
    } catch (err) {
      throw new BadRequestException(err?.message || 'Failed to create transaction');
    }
  }
}
