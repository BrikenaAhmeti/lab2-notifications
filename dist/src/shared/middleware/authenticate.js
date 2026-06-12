"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const app_error_1 = require("../core/errors/app-error");
function authenticate(req, _res, next) {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
        return next(new app_error_1.AppError('Missing bearer token', 401));
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtAccessSecret);
        const userId = payload.sub || payload.userId || payload.id;
        if (!userId) {
            return next(new app_error_1.AppError('Invalid token payload', 401));
        }
        req.user = {
            id: userId,
            email: payload.email,
            role: payload.role,
            roles: normalizeRoles(payload.roles, payload.role),
            permissions: payload.permissions,
        };
        return next();
    }
    catch {
        return next(new app_error_1.AppError('Invalid or expired token', 401));
    }
}
function normalizeRoles(roles, role) {
    return [...new Set([...(roles ?? []), role].filter((value) => Boolean(value)))];
}
