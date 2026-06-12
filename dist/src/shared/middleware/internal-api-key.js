"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireInternalApiKey = requireInternalApiKey;
const env_1 = require("../../config/env");
const app_error_1 = require("../core/errors/app-error");
function requireInternalApiKey(req, _res, next) {
    const apiKey = req.header('x-internal-api-key');
    if (!apiKey || apiKey !== env_1.env.internalApiKey) {
        return next(new app_error_1.AppError('Invalid internal API key', 401));
    }
    return next();
}
