"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthAuditLogClient = void 0;
const env_1 = require("../../../config/env");
class AuthAuditLogClient {
    baseUrl;
    internalApiKey;
    constructor(baseUrl = env_1.env.authServiceUrl, internalApiKey = env_1.env.internalApiKey) {
        this.baseUrl = baseUrl;
        this.internalApiKey = internalApiKey;
    }
    async record(input) {
        if (!this.baseUrl || !this.internalApiKey) {
            return;
        }
        try {
            const url = new URL('/internal/auth/audit-logs', this.baseUrl);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': this.internalApiKey,
                },
                body: JSON.stringify(input),
            });
            if (!response.ok) {
                console.warn('[chat-audit] auth service rejected audit log', {
                    action: input.action,
                    status: response.status,
                });
            }
        }
        catch (error) {
            console.warn('[chat-audit] unable to reach auth service', {
                action: input.action,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.AuthAuditLogClient = AuthAuditLogClient;
