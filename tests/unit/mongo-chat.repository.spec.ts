import { Db } from 'mongodb';

import { MongoChatRepository } from '../../src/modules/chat/infrastructure/mongo-chat.repository';

const userId = '55f75ac7-b85d-48a4-adba-df4ba1dcba61';
const staffId = 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0';

const rooms = [
    {
        id: '9b4b8118-5662-4cb4-89a9-f6424d248125',
        directKey: `${staffId}:${userId}`,
        participants: [staffId, userId],
        type: 'direct',
        lastMessageAt: new Date('2026-05-20T10:05:00.000Z'),
        lastMessage: null,
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
        updatedAt: new Date('2026-05-20T10:05:00.000Z'),
    },
    {
        id: 'ecaf6500-f20d-41d6-a63e-ab91d86c9307',
        directKey: `${staffId}:00000000-0000-4000-8000-000000000001`,
        participants: [staffId, userId],
        type: 'direct',
        lastMessageAt: null,
        lastMessage: null,
        createdAt: new Date('2026-05-19T10:00:00.000Z'),
        updatedAt: new Date('2026-05-19T10:00:00.000Z'),
    },
];

describe('MongoChatRepository', () => {
    it('adds unreadCount to each listed chat room', async () => {
        const roomCursor = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue(rooms),
        };
        const unreadCursor = {
            toArray: jest.fn().mockResolvedValue([
                {
                    _id: rooms[0].id,
                    count: 2,
                },
            ]),
        };
        const roomCollection = {
            find: jest.fn().mockReturnValue(roomCursor),
            countDocuments: jest.fn().mockResolvedValue(2),
        };
        const messageCollection = {
            aggregate: jest.fn().mockReturnValue(unreadCursor),
        };
        const db = {
            collection: jest.fn((name: string) => {
                if (name === 'chat_rooms') {
                    return roomCollection;
                }

                return messageCollection;
            }),
        } as unknown as Db;
        const repository = new MongoChatRepository(() => db);

        const result = await repository.listRooms({
            userId,
            page: 1,
            limit: 20,
        });

        expect(roomCollection.find).toHaveBeenCalledWith({ participants: userId });
        expect(messageCollection.aggregate).toHaveBeenCalledWith([
            {
                $match: {
                    roomId: { $in: rooms.map((room) => room.id) },
                    senderId: { $ne: userId },
                    isRead: false,
                },
            },
            { $group: { _id: '$roomId', count: { $sum: 1 } } },
        ]);
        expect(result.data).toEqual([
            expect.objectContaining({
                id: rooms[0].id,
                unreadCount: 2,
            }),
            expect.objectContaining({
                id: rooms[1].id,
                unreadCount: 0,
            }),
        ]);
        expect(result.meta).toEqual({
            page: 1,
            limit: 20,
            totalItems: 2,
            totalPages: 1,
        });
    });
});
