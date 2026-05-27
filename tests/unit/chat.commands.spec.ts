import {
    CreateDirectChatRoomCommand,
    CreateDirectChatRoomHandler,
    MarkChatRoomReadCommand,
    MarkChatRoomReadHandler,
    SendChatMessageCommand,
    SendChatMessageHandler,
    StoreChatAttachmentCommand,
    StoreChatAttachmentHandler,
} from '../../src/modules/chat/application/chat.commands';
import { ChatAttachmentStorage } from '../../src/modules/chat/domain/chat-attachment.storage';
import { ChatMessage, ChatRoom } from '../../src/modules/chat/domain/chat.entity';
import { ChatRepository } from '../../src/modules/chat/domain/chat.repository';
import { chatGateway } from '../../src/socket/chat.gateway';

const userId = '55f75ac7-b85d-48a4-adba-df4ba1dcba61';
const staffId = 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0';
const roomId = '9b4b8118-5662-4cb4-89a9-f6424d248125';

const room: ChatRoom = {
    id: roomId,
    participants: [userId, staffId],
    type: 'direct',
    lastMessageAt: null,
    lastMessage: null,
    createdAt: new Date('2026-05-20T10:00:00.000Z'),
    updatedAt: new Date('2026-05-20T10:00:00.000Z'),
};

const message: ChatMessage = {
    id: '916cd828-1cb4-48ff-8e7d-ad094b60de9a',
    roomId,
    senderId: userId,
    content: 'Hello doctor',
    type: 'text',
    fileUrl: null,
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-05-20T10:05:00.000Z'),
};

function createRepository(): jest.Mocked<ChatRepository> {
    return {
        findOrCreateDirectRoom: jest.fn().mockResolvedValue(room),
        findRoomForUser: jest.fn().mockResolvedValue(room),
        listRooms: jest.fn(),
        createMessage: jest.fn().mockResolvedValue(message),
        listMessages: jest.fn(),
        markRoomRead: jest.fn().mockResolvedValue({
            roomId,
            readCount: 2,
            readAt: new Date('2026-05-20T10:06:00.000Z'),
        }),
    };
}

describe('chat command handlers', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('creates or reuses a direct room for allowed participants', async () => {
        const repository = createRepository();
        const handler = new CreateDirectChatRoomHandler(repository);

        await expect(
            handler.execute(
                new CreateDirectChatRoomCommand(
                    {
                        id: userId,
                        roles: ['patient'],
                    },
                    staffId,
                    'doctor',
                ),
            ),
        ).resolves.toBe(room);

        expect(repository.findOrCreateDirectRoom).toHaveBeenCalledWith({
            participantIds: [userId, staffId],
        });
    });

    it('rejects direct rooms created with the same user twice', async () => {
        const repository = createRepository();
        const handler = new CreateDirectChatRoomHandler(repository);

        await expect(
            handler.execute(
                new CreateDirectChatRoomCommand(
                    {
                        id: userId,
                        roles: ['patient'],
                    },
                    userId,
                    'doctor',
                ),
            ),
        ).rejects.toThrow('Cannot create a chat room with yourself');
        expect(repository.findOrCreateDirectRoom).not.toHaveBeenCalled();
    });

    it('requires patient chat permission before staff create patient rooms', async () => {
        const repository = createRepository();
        const handler = new CreateDirectChatRoomHandler(repository);

        await expect(
            handler.execute(
                new CreateDirectChatRoomCommand(
                    {
                        id: staffId,
                        roles: ['doctor'],
                        permissions: ['appointments:read'],
                    },
                    userId,
                    'patient',
                ),
            ),
        ).rejects.toThrow('You are not allowed to create this chat room');
        expect(repository.findOrCreateDirectRoom).not.toHaveBeenCalled();
    });

    it('sends a message only after verifying room membership', async () => {
        const repository = createRepository();
        const emitMessage = jest.spyOn(chatGateway, 'emitMessage').mockImplementation();
        const handler = new SendChatMessageHandler(repository);

        await expect(
            handler.execute(
                new SendChatMessageCommand(roomId, userId, '  Hello doctor  ', 'text', null),
            ),
        ).resolves.toBe(message);

        expect(repository.findRoomForUser).toHaveBeenCalledWith(roomId, userId);
        expect(repository.createMessage).toHaveBeenCalledWith({
            roomId,
            senderId: userId,
            content: 'Hello doctor',
            type: 'text',
            fileUrl: null,
        });
        expect(emitMessage).toHaveBeenCalledWith(room.participants, message);
    });

    it('rejects file messages without a file URL', async () => {
        const repository = createRepository();
        const handler = new SendChatMessageHandler(repository);

        await expect(
            handler.execute(
                new SendChatMessageCommand(roomId, userId, 'Lab result', 'file', null),
            ),
        ).rejects.toThrow('File URL is required for file and image messages');
        expect(repository.createMessage).not.toHaveBeenCalled();
    });

    it('marks a room as read and emits read receipts when messages changed', async () => {
        const repository = createRepository();
        const emitRead = jest.spyOn(chatGateway, 'emitRead').mockImplementation();
        const handler = new MarkChatRoomReadHandler(repository);

        const result = await handler.execute(new MarkChatRoomReadCommand(roomId, userId));

        expect(result.readCount).toBe(2);
        expect(repository.markRoomRead).toHaveBeenCalledWith({ roomId, userId });
        expect(emitRead).toHaveBeenCalledWith(
            room.participants,
            expect.objectContaining({
                roomId,
                userId,
                readCount: 2,
            }),
        );
    });

    it('stores attachments only for room participants', async () => {
        const repository = createRepository();
        const storage: jest.Mocked<ChatAttachmentStorage> = {
            store: jest.fn().mockResolvedValue({
                fileName: 'result.pdf',
                fileUrl: '/uploads/chat/result.pdf',
                mimeType: 'application/pdf',
                size: 7,
            }),
        };
        const handler = new StoreChatAttachmentHandler(repository, storage);

        await expect(
            handler.execute(
                new StoreChatAttachmentCommand(
                    roomId,
                    userId,
                    'result.pdf',
                    'application/pdf',
                    Buffer.from('content'),
                ),
            ),
        ).resolves.toEqual(expect.objectContaining({ fileUrl: '/uploads/chat/result.pdf' }));

        expect(repository.findRoomForUser).toHaveBeenCalledWith(roomId, userId);
        expect(storage.store).toHaveBeenCalledWith(
            expect.objectContaining({
                roomId,
                userId,
                fileName: 'result.pdf',
            }),
        );
    });
});
