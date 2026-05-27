import {
    ListChatMessagesHandler,
    ListChatMessagesQuery,
    ListChatRoomsHandler,
    ListChatRoomsQuery,
} from '../../src/modules/chat/application/chat.queries';
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
