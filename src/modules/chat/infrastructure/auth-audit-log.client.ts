import { env } from '../../../config/env';
import { ChatAuditLogger, ChatAuditLogInput } from '../domain/chat-audit.logger';

export class AuthAuditLogClient implements ChatAuditLogger {
    constructor(
        private readonly baseUrl = env.authServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async record(input: ChatAuditLogInput): Promise<void> {
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
        } catch (error) {
            console.warn('[chat-audit] unable to reach auth service', {
                action: input.action,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
