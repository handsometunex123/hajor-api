import { Controller, Get, Param, Query, Body, NotFoundException, ForbiddenException, BadRequestException, UseGuards, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WalletService } from './wallet.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { wrapResponse } from '../../common/dto/wrap-response';
import { PaginatedTransactionsResponseDto } from './dto/paginated-transactions-response.dto';
import { PaginatedWalletsResponseDto } from './dto/paginated-wallets-response.dto';
import { BalanceResponseDto } from './dto/balance-response.dto';
import { OkResponseDto } from '../../common/dto/ok-response.dto';

@ApiTags('Wallets')
@Controller('wallets')
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me/balance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user\'s wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance', type: wrapResponse(BalanceResponseDto) })
  async getBalance(@CurrentUser() user: { id: string }) {
    const wallet = await this.walletService.getWalletByUser(user.id);
    if (!wallet) throw new NotFoundException('Wallet not found for user');
    const balance = await this.walletService.getBalance(wallet.id);
    return { balance };
  }

  // Get transaction history for authenticated user's wallet
  @Get('me/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user\'s transaction history' })
  @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'], description: 'Filter by transaction type' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by transaction status' })
  @ApiResponse({ status: 200, description: 'Transaction history', type: wrapResponse(PaginatedTransactionsResponseDto) })
  async listTransactions(@CurrentUser() user: { id: string }, @Query() q: ListQueryDto, @Query('type') type?: string, @Query('status') status?: string) {
    const wallet = await this.walletService.getWalletByUser(user.id);
    if (!wallet) throw new NotFoundException('Wallet not found for user');
    return this.walletService.getTransactions(wallet.id, { page: q.page, limit: q.limit, type, status, sortBy: q.sortBy, sortOrder: q.sortOrder as 'asc' | 'desc' });
  }

  @Get('admin/non-provisioned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List non-provisioned wallets (admin)' })
  @ApiResponse({ status: 200, description: 'List of non-provisioned wallets', type: wrapResponse(PaginatedWalletsResponseDto) })
  async listNonProvisioned(@Query() query: ListQueryDto) {
    // admin listing: wallets where VA is not yet provisioned
    const opts: any = {};
    if (query.page) opts.page = query.page;
    if (query.limit) opts.limit = query.limit;
    if (query.sortBy) opts.sortBy = query.sortBy;
    if (query.sortOrder) opts.sortOrder = query.sortOrder;
    const rows = await this.walletService.listNonProvisioned(opts);
    return rows;
  }
  
    @Post(':walletId/provisions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Trigger wallet provisioning (admin)' })
    @ApiResponse({ status: 200, description: 'Provision triggered', type: wrapResponse(OkResponseDto) })
    async adminTriggerProvision(@Param('walletId') walletId: string) {
      try {
        return await this.walletService.triggerProvision(walletId);
      } catch (err) {
        throw new NotFoundException(err?.message || 'Failed to enqueue provisioning');
      }
    }

  /**
   * DEV ONLY — instantly provisions all un-provisioned wallets with dummy data.
   * Not available in production (returns 403).
   */
  @Post('dev/provision-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '[DEV ONLY] Provision all wallets', description: 'Instantly marks every un-provisioned wallet as PROVISIONED with dummy Paystack data. Only works when NODE_ENV !== production.' })
  @ApiResponse({ status: 200, description: 'Wallets provisioned.' })
  @ApiResponse({ status: 403, description: 'Not available in production.' })
  async devProvisionAll() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is not available in production');
    }
    return this.walletService.devProvisionAll();
  }

  /**
   * DEV ONLY — credit a user's wallet directly, bypassing Paystack.
   * Use this to seed test balances so auto-debit jobs have funds to collect.
   */
  @Post('dev/fund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: '[DEV ONLY] Fund a user wallet',
    description: 'Creates a SUCCESS CREDIT transaction on the specified user\'s wallet. Not available in production.',
  })
  @ApiBody({
    schema: {
      required: ['userId', 'amount'],
      properties: {
        userId: { type: 'string', example: 'clxyz123abc', description: 'ID of the user whose wallet to fund' },
        amount: { type: 'number', example: 15000, description: 'Amount to credit (positive number)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Wallet funded', schema: { type: 'object', properties: { walletId: { type: 'string' }, credited: { type: 'number' }, newBalance: { type: 'string' } } } })
  @ApiResponse({ status: 403, description: 'Not available in production.' })
  async devFundWallet(@Body('userId') userId: string, @Body('amount') amount: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is not available in production');
    }
    if (!userId) throw new BadRequestException('userId is required');
    if (!amount || amount <= 0) throw new BadRequestException('amount must be a positive number');
    try {
      return await this.walletService.devFundWallet(userId, amount);
    } catch (err: any) {
      throw new NotFoundException(err?.message || 'Failed to fund wallet');
    }
  }
}
