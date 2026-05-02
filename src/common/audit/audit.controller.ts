import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'List all audit log entries (SUPER_ADMIN only)',
    description: `
        Returns a paginated, sortable, filterable list of all audit log entries on the platform.

        **Filters available:**
        - \`actorId\` — UUID of the user who triggered the action. Pass \`null\` (string) to see only system-generated entries.
        - \`action\` — Exact action name, e.g. \`provision_va\`, \`send_otp\`, \`reconcile_deposit_success\`.
        - \`entityType\` — Exact entity type, e.g. \`User\`, \`Wallet\`, \`Transaction\`, \`Group\`, \`Invitation\`.
        - \`entityId\` — UUID of the specific entity affected.
        - \`search\` — Case-insensitive substring match on the \`action\` field.
        - \`from\` / \`to\` — ISO-8601 date range filter on \`createdAt\`.

        **Sorting:**
        - \`sortBy\`: \`createdAt\` (default) | \`action\` | \`entityType\` | \`actorId\`
        - \`sortOrder\`: \`desc\` (default) | \`asc\`
            `,
  })
  async list(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }
}
