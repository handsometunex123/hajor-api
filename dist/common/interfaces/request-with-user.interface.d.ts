import { Request } from 'express';
export interface RequestWithUser extends Request {
    user?: ({
        id?: string;
        sub?: string;
    } & {
        [key: string]: unknown;
    }) | null;
}
