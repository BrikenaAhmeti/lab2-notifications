export type ActivityStreamItem = {
    id: string;
    actionType: string;
    description: string;
    actorName: string;
    entityLabel: string;
    entityLink: string | null;
    createdAt: Date;
};

export type CreateActivityInput = Omit<ActivityStreamItem, 'id' | 'createdAt'> & {
    createdAt?: Date;
    actorId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    facilityId?: string | null;
    departmentId?: string | null;
    metadata?: Record<string, unknown>;
};

export type PersistActivityInput = CreateActivityInput;

export type ListActivityInput = {
    page: number;
    limit: number;
};

export type PaginatedActivityStream = {
    data: ActivityStreamItem[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
};
