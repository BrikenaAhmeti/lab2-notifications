"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCorsOriginAllowed = isCorsOriginAllowed;
exports.corsOrigin = corsOrigin;
const env_1 = require("../config/env");
const configuredOrigins = env_1.env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
function isLocalDevelopmentOrigin(origin) {
    if (env_1.env.nodeEnv === 'production') {
        return false;
    }
    try {
        const url = new URL(origin);
        return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    }
    catch {
        return false;
    }
}
function isCorsOriginAllowed(origin) {
    if (!origin)
        return true;
    if (configuredOrigins.includes(origin))
        return true;
    if (configuredOrigins.includes('*') && env_1.env.nodeEnv !== 'production')
        return true;
    return isLocalDevelopmentOrigin(origin);
}
function corsOrigin(origin, callback) {
    if (isCorsOriginAllowed(origin)) {
        return callback(null, true);
    }
    return callback(null, false);
}
