import { Db } from 'mongodb';

import { MongoActivityRepository } from '../../src/modules/dashboard/infrastructure/mongo-activity.repository';

const activity = {
    id: 'activity-1',
    actionType: 'inventory.low_stock',
    description: 'Gloves are below their reorder level.',
    actorName: 'System',
    actorId: null,
    entityType: 'inventory_item',
    entityId: 'item-1',
    entityLabel: 'Gloves',
    entityLink: '/admin/inventory/items/item-1',
    facilityId: 'facility-1',
    departmentId: 'department-1',
    metadata: { itemName: 'Gloves' },
    createdAt: new Date('2026-05-27T10:00:00.000Z'),
};

describe('MongoActivityRepository', () => {
    it('lists recent activity in newest-first pagination order', async () => {
        const cursor = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue([activity]),
        };
        const collection = {
            find: jest.fn().mockReturnValue(cursor),
            countDocuments: jest.fn().mockResolvedValue(21),
        };
        const db = {
            collection: jest.fn().mockReturnValue(collection),
        } as unknown as Db;
        const repository = new MongoActivityRepository(() => db);

        const result = await repository.list({ page: 2, limit: 20 });

        expect(collection.find).toHaveBeenCalledWith({});
        expect(cursor.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(cursor.skip).toHaveBeenCalledWith(20);
        expect(cursor.limit).toHaveBeenCalledWith(20);
        expect(result).toEqual({
            data: [{
                id: activity.id,
                actionType: activity.actionType,
                description: activity.description,
                actorName: activity.actorName,
                entityLabel: activity.entityLabel,
                entityLink: activity.entityLink,
                createdAt: activity.createdAt,
            }],
            meta: {
                page: 2,
                limit: 20,
                totalItems: 21,
                totalPages: 2,
            },
        });
    });

    it('persists activity_streams documents and returns frontend fields only', async () => {
        const collection = {
            insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
        };
        const db = {
            collection: jest.fn().mockReturnValue(collection),
        } as unknown as Db;
        const repository = new MongoActivityRepository(() => db);

        const result = await repository.create({
            actionType: 'inventory.low_stock',
            description: 'Gloves are below their reorder level.',
            actorName: 'System',
            entityLabel: 'Gloves',
            entityLink: '/admin/inventory/items/item-1',
            entityType: 'inventory_item',
            entityId: 'item-1',
            facilityId: 'facility-1',
            createdAt: activity.createdAt,
            metadata: { itemName: 'Gloves' },
        });

        expect(collection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
            id: expect.any(String),
            actionType: 'inventory.low_stock',
            facilityId: 'facility-1',
            metadata: { itemName: 'Gloves' },
            createdAt: activity.createdAt,
        }));
        expect(result).toEqual({
            id: expect.any(String),
            actionType: 'inventory.low_stock',
            description: 'Gloves are below their reorder level.',
            actorName: 'System',
            entityLabel: 'Gloves',
            entityLink: '/admin/inventory/items/item-1',
            createdAt: activity.createdAt,
        });
    });
});
