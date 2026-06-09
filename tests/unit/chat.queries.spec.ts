import {
    ListChatMessagesHandler,
    ListChatMessagesQuery,
    ListChatRoomsHandler,
    ListChatRoomsQuery,
} from '../../src/modules/chat/application/chat.queries';
import { AuthUserDirectoryClient } from '../../src/modules/chat/infrastructure/auth-user-directory.client';
import { ChatParticipantDirectory } from '../../src/modules/chat/domain/chat-participant-directory';
import { ChatRepository } from '../../src/modules/chat/domain/chat.repository';

const userId = '55f75ac7-b85d-48a4-adba-df4ba1dcba61';
const roomId = '9b4b8118-5662-4cb4-89a9-f6424d248125';

function createRepository(): jest.Mocked<ChatRepository> {
    return {
        findOrCreateDirectRoom: jest.fn(),
        findRoomForUser: jest.fn().mockResolvedValue({
            id: roomId,
            participants: [userId, 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0'],
            type: 'direct',
            lastMessageAt: null,
            lastMessage: null,
            createdAt: new Date('2026-05-20T10:00:00.000Z'),
            updatedAt: new Date('2026-05-20T10:00:00.000Z'),
        }),
        listRooms: jest.fn().mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        }),
        createMessage: jest.fn(),
        listMessages: jest.fn().mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        }),
        markRoomRead: jest.fn(),
    };
}

describe('chat query handlers', () => {
    it('lists rooms for the authenticated user', async () => {
        const repository = createRepository();
        const handler = new ListChatRoomsHandler(repository);

        await handler.execute(new ListChatRoomsQuery(userId, 1, 20));

        expect(repository.listRooms).toHaveBeenCalledWith({
            userId,
            page: 1,
            limit: 20,
        });
    });

    it('enriches listed room participants from the user directory', async () => {
        const repository = createRepository();
        const otherUserId = 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0';
        const createdAt = new Date('2026-05-20T10:00:00.000Z');
        repository.listRooms.mockResolvedValue({
            data: [
                {
                    id: roomId,
                    participants: [userId, otherUserId],
                    type: 'direct',
                    lastMessageAt: createdAt,
                    lastMessage: null,
                    createdAt,
                    updatedAt: createdAt,
                    unreadCount: 0,
                },
            ],
            meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        });
        const participantDirectory: ChatParticipantDirectory = {
            listByUserIds: jest.fn().mockResolvedValue(
                new Map([
                    [
                        otherUserId,
                        {
                            id: otherUserId,
                            userId: otherUserId,
                            firstName: 'Anika',
                            lastName: 'Rao',
                            email: 'doctor@medsphere.local',
                            role: 'doctor',
                            roles: ['Doctor'],
                        },
                    ],
                ]),
            ),
        };
        const handler = new ListChatRoomsHandler(repository, participantDirectory);

        const result = await handler.execute(new ListChatRoomsQuery(userId, 1, 20));

        expect(participantDirectory.listByUserIds).toHaveBeenCalledWith([
            userId,
            otherUserId,
        ]);
        expect(result.data[0].participants).toEqual([
            userId,
            expect.objectContaining({
                userId: otherUserId,
                firstName: 'Anika',
                lastName: 'Rao',
                role: 'doctor',
            }),
        ]);
    });

    it('checks room membership before listing messages', async () => {
        const repository = createRepository();
        const handler = new ListChatMessagesHandler(repository);

        await handler.execute(new ListChatMessagesQuery(roomId, userId, 1, 20));

        expect(repository.findRoomForUser).toHaveBeenCalledWith(roomId, userId);
        expect(repository.listMessages).toHaveBeenCalledWith({
            roomId,
            userId,
            page: 1,
            limit: 20,
        });
    });

    it('rejects message history when the room is not visible to the user', async () => {
        const repository = createRepository();
        repository.findRoomForUser.mockResolvedValue(null);
        const handler = new ListChatMessagesHandler(repository);

        await expect(
            handler.execute(new ListChatMessagesQuery(roomId, userId, 1, 20)),
        ).rejects.toThrow('Chat room not found');
        expect(repository.listMessages).not.toHaveBeenCalled();
    });
});

describe('AuthUserDirectoryClient', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('uses core staff names when enriching chat participants', async () => {
        const staffUserId = 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0';
        global.fetch = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [
                        {
                            id: staffUserId,
                            userId: staffUserId,
                            email: 'elizabeta@medsphere.local',
                            role: 'doctor',
                        },
                    ],
                }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    items: [
                        {
                            id: 'staff-profile-1',
                            userId: staffUserId,
                            user: {
                                id: staffUserId,
                                name: 'Dr. Elizabeta',
                                email: 'elizabeta@medsphere.local',
                                roles: ['Doctor'],
                            },
                            specialization: 'Orthopedics',
                            positionType: { defaultRoleKey: 'doctor' },
                        },
                    ],
                }),
            } as Response);
        const client = new AuthUserDirectoryClient(
            'http://auth.local',
            'internal-key',
            'http://core.local',
        );

        const profiles = await client.listByUserIds([userId, staffUserId]);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(profiles.get(staffUserId)).toEqual(
            expect.objectContaining({
                userId: staffUserId,
                name: 'Dr. Elizabeta',
                email: 'elizabeta@medsphere.local',
                role: 'doctor',
            }),
        );
    });
});
