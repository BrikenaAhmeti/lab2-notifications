"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const app_error_1 = require("../core/errors/app-error");
function errorHandler(error, _req, res, _next) {
    if (error instanceof app_error_1.AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }
    if (error instanceof zod_1.ZodError) {
        return res.status(422).json({
            message: 'Validation failed',
            issues: error.issues,
        });
    }
    const httpError = error;
    if (httpError.status === 400 || httpError.statusCode === 400) {
        return res.status(400).json({
            message: httpError.expose ? httpError.message : 'Bad request',
        });
    }
    return res.status(500).json({
        message: 'Internal server error',
    });
}
