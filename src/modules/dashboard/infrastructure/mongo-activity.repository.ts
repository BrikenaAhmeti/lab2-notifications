import { randomUUID } from 'crypto';
import { Collection, Db } from 'mongodb';

import { AppError } from '../../../shared/core/errors/app-error';
import {
    ActivityStreamItem,
    ListActivityInput,
    PaginatedActivityStream,
    PersistActivityInput,
} from '../domain/activity.entity';
import { ActivityRepository } from '../domain/activity.repository';

type ActivityStreamDocument = ActivityStreamItem & {
    actorId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    facilityId?: string | null;
    departmentId?: string | null;
    metadata?: Record<string, unknown>;
};

export class MongoActivityRepository implements ActivityRepository {
    constructor(private readonly dbProvider: () => Db | undefined) {}

    async create(input: PersistActivityInput): Promise<ActivityStreamItem> {
        const createdAt = input.createdAt ?? new Date();
        const document: ActivityStreamDocument = {
            id: randomUUID(),
            actionType: input.actionType,
            description: input.description,
            actorName: input.actorName,
            actorId: input.actorId ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            entityLabel: input.entityLabel,
            entityLink: input.entityLink ?? null,
            facilityId: input.facilityId ?? null,
            departmentId: input.departmentId ?? null,
            metadata: input.metadata,
            createdAt,
        };

        await this.activities.insertOne(document);

        return toActivityStreamItem(document);
    }

    async list(input: ListActivityInput): Promise<PaginatedActivityStream> {
        const [items, totalItems] = await Promise.all([
            this.activities
                .find({})
                .sort({ createdAt: -1 })
                .skip((input.page - 1) * input.limit)
                .limit(input.limit)
                .toArray(),
            this.activities.countDocuments({}),
        ]);

        return {
            data: items.map(toActivityStreamItem),
            meta: {
                page: input.page,
                limit: input.limit,
                totalItems,
                totalPages: Math.ceil(totalItems / input.limit),
            },
        };
    }

    private get activities(): Collection<ActivityStreamDocument> {
        return this.db.collection<ActivityStreamDocument>('activity_streams');
    }

    private get db(): Db {
        const db = this.dbProvider();

        if (!db) {
            throw new AppError('MongoDB is not configured for activity streams', 503);
        }

        return db;
    }
}

function toActivityStreamItem(document: ActivityStreamDocument): ActivityStreamItem {
    return {
        id: document.id,
        actionType: document.actionType,
        description: document.description,
        actorName: document.actorName,
        entityLabel: document.entityLabel,
        entityLink: document.entityLink,
        createdAt: document.createdAt,
    };
}
