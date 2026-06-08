export type ChatAuditLogInput = {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
};

export interface ChatAuditLogger {
    record(input: ChatAuditLogInput): Promise<void>;
}
