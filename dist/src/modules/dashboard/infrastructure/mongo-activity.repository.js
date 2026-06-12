"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoActivityRepository = void 0;
const crypto_1 = require("crypto");
const app_error_1 = require("../../../shared/core/errors/app-error");
class MongoActivityRepository {
    dbProvider;
    constructor(dbProvider) {
        this.dbProvider = dbProvider;
    }
    async create(input) {
        const createdAt = input.createdAt ?? new Date();
        const document = {
            id: (0, crypto_1.randomUUID)(),
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
    async list(input) {
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
    get activities() {
        return this.db.collection('activity_streams');
    }
    get db() {
        const db = this.dbProvider();
        if (!db) {
            throw new app_error_1.AppError('MongoDB is not configured for activity streams', 503);
        }
        return db;
    }
}
exports.MongoActivityRepository = MongoActivityRepository;
function toActivityStreamItem(document) {
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
