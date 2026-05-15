import { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env';
import { AppError } from '../core/errors/app-error';

export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction) {
    const apiKey = req.header('x-internal-api-key');

    if (!apiKey || apiKey !== env.internalApiKey) {
        return next(new AppError('Invalid internal API key', 401));
    }

    return next();
}
