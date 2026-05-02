import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
export declare class TicketController {
    private readonly ticketService;
    constructor(ticketService: TicketService);
    create(req: RequestWithUser, dto: CreateTicketDto): Promise<import("@prisma/client/runtime").GetResult<{
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
    getTicket(id: string): Promise<{
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
    getMyTickets(req: RequestWithUser, query: ListQueryDto, status?: string, type?: string): Promise<{
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
    getGroupTickets(req: RequestWithUser, groupId: string, query: ListQueryDto, status?: string, type?: string): Promise<{
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
    updateStatus(req: RequestWithUser, id: string, dto: UpdateTicketStatusDto): Promise<import("@prisma/client/runtime").GetResult<{
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
}
