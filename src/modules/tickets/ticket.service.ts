import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { createContributorWithDisplayId } from '../../common/utils/generate-display-id';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    // Validate that user is a contributor of the group
    const contributor = await this.prisma.groupContributor.findFirst({
      where: { groupId: dto.groupId, userId },
    });

    if (!contributor) {
      throw new BadRequestException('You must be a contributor of this group to create a ticket');
    }

    // Validate type-specific requirements
    if (dto.type === 'CONTRIBUTOR_REPLACEMENT') {
      if (!dto.contributorId || !dto.newUserId) {
        throw new BadRequestException('CONTRIBUTOR_REPLACEMENT requires contributorId and newUserId');
      }
      
      // Verify the contributorId is valid and in this group
      const targetContributor = await this.prisma.groupContributor.findUnique({
        where: { id: dto.contributorId },
      });
      
      if (!targetContributor || targetContributor.groupId !== dto.groupId) {
        throw new BadRequestException('Invalid contributor for this group');
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        type: dto.type,
        groupId: dto.groupId,
        userId,
        reason: dto.reason,
        contributorId: dto.contributorId,
        newUserId: dto.newUserId,
        status: 'PENDING',
      } as any,
    });

    return ticket;
  }

  async getTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        group: { select: { id: true, name: true, adminId: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async getUserTickets(userId: string, opts?: { page?: number; limit?: number; status?: string; type?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status', 'type'];
    const sortBy = opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { userId };
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          group: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: tickets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getGroupTickets(groupId: string, adminId: string, opts?: { page?: number; limit?: number; status?: string; type?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    // Verify user is admin of the group
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.adminId !== adminId) {
      throw new BadRequestException('Only group admin can view group tickets');
    }

    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'status', 'type'];
    const sortBy = opts?.sortBy && allowedSortFields.includes(opts.sortBy) ? opts.sortBy : 'createdAt';
    const sortOrder = opts?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { groupId };
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: tickets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateTicketStatus(ticketId: string, adminId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { group: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.group.adminId !== adminId) {
      throw new BadRequestException('Only group admin can update ticket status');
    }

    const updateData: any = {
      status: dto.status,
      adminNotes: dto.adminNotes,
    };

    if (dto.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // If approved, execute the ticket action
    if (dto.status === 'APPROVED') {
      await this.executeTicketAction(ticket);
    }

    return updated;
  }

  private async executeTicketAction(ticket: any) {
    if (ticket.type === 'CONTRIBUTOR_REPLACEMENT' && ticket.contributorId && ticket.newUserId) {
      // Replace contributor
      await this.prisma.$transaction(async (tx) => {
        const group = await tx.group.findUnique({ where: { id: ticket.groupId } });
        if (!group) throw new NotFoundException('Group not found');
        if (group.status !== 'NOT_STARTED') throw new BadRequestException('Can only replace contributors while group is NOT_STARTED');

        const newUserSlots = await tx.groupContributor.count({ where: { groupId: ticket.groupId, userId: ticket.newUserId } });
        if (newUserSlots >= 2) throw new BadRequestException('Replacement user already has the maximum slots in this group');

        // Remove old contributor
        await tx.groupContributor.delete({
          where: { id: ticket.contributorId },
        });

        // Add new contributor
        const newUser = await tx.user.findUnique({ where: { id: ticket.newUserId } });
        const slotNumber = newUserSlots + 1;
        await createContributorWithDisplayId(tx, {
          groupId: ticket.groupId, userId: ticket.newUserId, firstName: newUser?.firstName, lastName: newUser?.lastName, slotNumber,
        }, {
          joinMethod: 'migration',
        });
      });
    } else if (ticket.type === 'LEAVE_GROUP') {
      // Remove user from group (only before group has started)
      await this.prisma.$transaction(async (tx) => {
        const group = await tx.group.findUnique({ where: { id: ticket.groupId } });
        if (!group) throw new NotFoundException('Group not found');
        if (group.status !== 'NOT_STARTED') {
          throw new BadRequestException('Cannot leave a group that has already started. Please raise a dispute instead.');
        }

        await tx.groupContributor.deleteMany({
          where: { groupId: ticket.groupId, userId: ticket.userId },
        });

        await tx.auditLog.create({
          data: {
            actorId: ticket.userId,
            action: 'leave_group',
            entityType: 'Group',
            entityId: ticket.groupId,
            metadata: { ticketId: ticket.id },
          },
        });
      });
    }
  }
}
