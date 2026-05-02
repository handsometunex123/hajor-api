import { UserRole } from '@prisma/client';
export declare class ListUsersDto {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    role?: UserRole;
    includeUnverified?: boolean;
}
