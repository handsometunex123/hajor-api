import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
export declare class TicketService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createTicket(userId: string, dto: CreateTicketDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        type: import(".prisma/client").TicketType;
        status: import(".prisma/client").TicketStatus;
        groupId: string;
        userId: string;
        reason: string | null;
        contributorId: string | null;
        newUserId: string | null;
        cycleId: string | null;
        requestedDate: Date | null;
        adminNotes: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    getTicket(ticketId: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        group: {
            id: string;
            name: string;
            adminId: string;
        };
    } & import("@prisma/client/runtime").GetResult<{
        id: string;
        type: import(".prisma/client").TicketType;
        status: import(".prisma/client").TicketStatus;
        groupId: string;
        userId: string;
        reason: string | null;
        contributorId: string | null;
        newUserId: string | null;
        cycleId: string | null;
        requestedDate: Date | null;
        adminNotes: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    getUserTickets(userId: string, opts?: {
        page?: number;
        limit?: number;
        status?: string;
        type?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: ({
            group: {
                id: string;
                name: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            type: import(".prisma/client").TicketType;
            status: import(".prisma/client").TicketStatus;
            groupId: string;
            userId: string;
            reason: string | null;
            contributorId: string | null;
            newUserId: string | null;
            cycleId: string | null;
            requestedDate: Date | null;
            adminNotes: string | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getGroupTickets(groupId: string, adminId: string, opts?: {
        page?: number;
        limit?: number;
        status?: string;
        type?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        items: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
            };
        } & import("@prisma/client/runtime").GetResult<{
            id: string;
            type: import(".prisma/client").TicketType;
            status: import(".prisma/client").TicketStatus;
            groupId: string;
            userId: string;
            reason: string | null;
            contributorId: string | null;
            newUserId: string | null;
            cycleId: string | null;
            requestedDate: Date | null;
            adminNotes: string | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }, unknown> & {})[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    updateTicketStatus(ticketId: string, adminId: string, dto: UpdateTicketStatusDto): Promise<import("@prisma/client/runtime").GetResult<{
        id: string;
        type: import(".prisma/client").TicketType;
        status: import(".prisma/client").TicketStatus;
        groupId: string;
        userId: string;
        reason: string | null;
        contributorId: string | null;
        newUserId: string | null;
        cycleId: string | null;
        requestedDate: Date | null;
        adminNotes: string | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    private executeTicketAction;
}
