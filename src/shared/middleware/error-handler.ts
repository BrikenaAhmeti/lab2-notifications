import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../core/errors/app-error';

type HttpParserError = Error & {
    status?: number;
    statusCode?: number;
    expose?: boolean;
};

export function errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }

    if (error instanceof ZodError) {
        return res.status(422).json({
            message: 'Validation failed',
            issues: error.issues,
        });
    }

    const httpError = error as HttpParserError;

    if (httpError.status === 400 || httpError.statusCode === 400) {
        return res.status(400).json({
            message: httpError.expose ? httpError.message : 'Bad request',
        });
    }

    return res.status(500).json({
        message: 'Internal server error',
    });
}
