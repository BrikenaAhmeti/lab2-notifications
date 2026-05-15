import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { AppError } from '../core/errors/app-error';
import { AuthenticatedUser } from '../core/types/request-with-user';

type JwtPayload = {
    sub?: string;
    userId?: string;
    id?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
};

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthenticatedUser;
    }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
        return next(new AppError('Missing bearer token', 401));
    }

    try {
        const payload = jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
        const userId = payload.sub || payload.userId || payload.id;

        if (!userId) {
            return next(new AppError('Invalid token payload', 401));
        }

        req.user = {
            id: userId,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
        };

        return next();
    } catch {
        return next(new AppError('Invalid or expired token', 401));
    }
}
