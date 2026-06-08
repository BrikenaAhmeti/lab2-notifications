import { Request } from 'express';

export type AuthenticatedUser = {
    id: string;
    email?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
};

export type RequestWithUser = Request & {
    user: AuthenticatedUser;
};
