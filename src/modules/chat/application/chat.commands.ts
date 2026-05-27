import { chatGateway } from '../../../socket/chat.gateway';
import { Command, CommandHandler } from '../../../shared/core/buses/command-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { AuthenticatedUser } from '../../../shared/core/types/request-with-user';
import { assertCanCreateDirectRoom } from '../domain/chat-access-policy';
import { ChatAttachmentStorage } from '../domain/chat-attachment.storage';
import {
    ChatAttachment,
    ChatMessage,
    ChatMessageType,
    ChatParticipantRole,
    ChatRoom,
    MarkChatRoomReadResult,
} from '../domain/chat.entity';
import { ChatRepository } from '../domain/chat.repository';

export class CreateDirectChatRoomCommand implements Command {
    constructor(
        public readonly currentUser: AuthenticatedUser,
        public readonly participantId: string,
        public readonly participantRole: ChatParticipantRole,
    ) {}
}

export class SendChatMessageCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly senderId: string,
        public readonly content: string,
        public readonly type: ChatMessageType,
        public readonly fileUrl: string | null,
    ) {}
}

export class MarkChatRoomReadCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly userId: string,
    ) {}
}

export class StoreChatAttachmentCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly userId: string,
        public readonly fileName: string,
        public readonly mimeType: string | undefined,
        public readonly bytes: Buffer,
    ) {}
}

export class CreateDirectChatRoomHandler
    implements CommandHandler<CreateDirectChatRoomCommand, ChatRoom>
{
    constructor(private readonly repository: ChatRepository) {}

    async execute(command: CreateDirectChatRoomCommand): Promise<ChatRoom> {
        assertCanCreateDirectRoom({
            currentUser: command.currentUser,
            participantId: command.participantId,
            participantRole: command.participantRole,
        });

        return this.repository.findOrCreateDirectRoom({
            participantIds: [command.currentUser.id, command.participantId],
        });
    }
}

export class SendChatMessageHandler
    implements CommandHandler<SendChatMessageCommand, ChatMessage>
{
    constructor(private readonly repository: ChatRepository) {}

    async execute(command: SendChatMessageCommand): Promise<ChatMessage> {
        const room = await this.repository.findRoomForUser(command.roomId, command.senderId);

        if (!room) {
            throw new AppError('Chat room not found', 404);
        }

        if (command.type === 'text' && !command.content.trim()) {
            throw new AppError('Message content is required', 422);
        }

        if (command.type !== 'text' && !command.fileUrl) {
            throw new AppError('File URL is required for file and image messages', 422);
        }

        const message = await this.repository.createMessage({
            roomId: command.roomId,
            senderId: command.senderId,
            content: command.content.trim(),
            type: command.type,
            fileUrl: command.fileUrl,
        });

        chatGateway.emitMessage(room.participants, message);

        return message;
    }
}

export class MarkChatRoomReadHandler
    implements CommandHandler<MarkChatRoomReadCommand, MarkChatRoomReadResult>
{
    constructor(private readonly repository: ChatRepository) {}

    async execute(command: MarkChatRoomReadCommand): Promise<MarkChatRoomReadResult> {
        const room = await this.repository.findRoomForUser(command.roomId, command.userId);

        if (!room) {
            throw new AppError('Chat room not found', 404);
        }

        const result = await this.repository.markRoomRead({
            roomId: command.roomId,
            userId: command.userId,
        });

        if (result.readCount > 0) {
            chatGateway.emitRead(room.participants, {
                roomId: command.roomId,
                userId: command.userId,
                readAt: result.readAt,
                readCount: result.readCount,
            });
        }

        return result;
    }
}

export class StoreChatAttachmentHandler
    implements CommandHandler<StoreChatAttachmentCommand, ChatAttachment>
{
    constructor(
        private readonly repository: ChatRepository,
        private readonly storage: ChatAttachmentStorage,
    ) {}

    async execute(command: StoreChatAttachmentCommand): Promise<ChatAttachment> {
        const room = await this.repository.findRoomForUser(command.roomId, command.userId);

        if (!room) {
            throw new AppError('Chat room not found', 404);
        }

        if (!command.bytes.length) {
            throw new AppError('Attachment content is required', 422);
        }

        return this.storage.store({
            roomId: command.roomId,
            userId: command.userId,
            fileName: command.fileName,
            mimeType: command.mimeType,
            bytes: command.bytes,
        });
    }
}
