import { chatGateway } from '../../../socket/chat.gateway';
import { Command, CommandHandler } from '../../../shared/core/buses/command-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { AuthenticatedUser } from '../../../shared/core/types/request-with-user';
import { assertCanCreateDirectRoom } from '../domain/chat-access-policy';
import { ChatAuditLogger, ChatAuditLogInput } from '../domain/chat-audit.logger';
import { ChatAttachmentStorage } from '../domain/chat-attachment.storage';
import { ChatMessageNotifier } from '../domain/chat-message-notifier';
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
        public readonly ipAddress?: string,
        public readonly userAgent?: string,
    ) {}
}

export class SendChatMessageCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly senderId: string,
        public readonly content: string,
        public readonly type: ChatMessageType,
        public readonly fileUrl: string | null,
        public readonly ipAddress?: string,
        public readonly userAgent?: string,
    ) {}
}

export class MarkChatRoomReadCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly userId: string,
        public readonly ipAddress?: string,
        public readonly userAgent?: string,
    ) {}
}

export class StoreChatAttachmentCommand implements Command {
    constructor(
        public readonly roomId: string,
        public readonly userId: string,
        public readonly fileName: string,
        public readonly mimeType: string | undefined,
        public readonly bytes: Buffer,
        public readonly ipAddress?: string,
        public readonly userAgent?: string,
    ) {}
}

export class CreateDirectChatRoomHandler
    implements CommandHandler<CreateDirectChatRoomCommand, ChatRoom>
{
    constructor(
        private readonly repository: ChatRepository,
        private readonly auditLogger?: ChatAuditLogger,
    ) {}

    async execute(command: CreateDirectChatRoomCommand): Promise<ChatRoom> {
        assertCanCreateDirectRoom({
            currentUser: command.currentUser,
            participantId: command.participantId,
            participantRole: command.participantRole,
        });

        const room = await this.repository.findOrCreateDirectRoom({
            participantIds: [command.currentUser.id, command.participantId],
        });

        await recordChatAudit(this.auditLogger, {
            userId: command.currentUser.id,
            action: 'chat.room.opened',
            entity: 'chat_room',
            entityId: room.id,
            newValue: {
                roomId: room.id,
                participantId: command.participantId,
                participantRole: command.participantRole,
                participantIds: room.participants,
            },
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
        });

        return room;
    }
}

export class SendChatMessageHandler
    implements CommandHandler<SendChatMessageCommand, ChatMessage>
{
    constructor(
        private readonly repository: ChatRepository,
        private readonly auditLogger?: ChatAuditLogger,
        private readonly messageNotifier?: ChatMessageNotifier,
    ) {}

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

        const recipientIds = room.participants.filter(
            (participantId) => participantId !== command.senderId,
        );

        await recordChatAudit(this.auditLogger, {
            userId: command.senderId,
            action: 'chat.message.sent',
            entity: 'chat_message',
            entityId: message.id,
            newValue: {
                roomId: command.roomId,
                messageId: message.id,
                senderId: command.senderId,
                recipientIds,
                type: message.type,
                hasAttachment: Boolean(message.fileUrl),
                contentLength: message.content.length,
            },
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
        });

        chatGateway.emitMessage(room.participants, message);
        await notifyChatRecipients(this.messageNotifier, message, recipientIds);

        return message;
    }
}

export class MarkChatRoomReadHandler
    implements CommandHandler<MarkChatRoomReadCommand, MarkChatRoomReadResult>
{
    constructor(
        private readonly repository: ChatRepository,
        private readonly auditLogger?: ChatAuditLogger,
    ) {}

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

            await recordChatAudit(this.auditLogger, {
                userId: command.userId,
                action: 'chat.room.read',
                entity: 'chat_room',
                entityId: command.roomId,
                newValue: {
                    roomId: command.roomId,
                    userId: command.userId,
                    readCount: result.readCount,
                    readAt: result.readAt.toISOString(),
                },
                ipAddress: command.ipAddress,
                userAgent: command.userAgent,
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
        private readonly auditLogger?: ChatAuditLogger,
    ) {}

    async execute(command: StoreChatAttachmentCommand): Promise<ChatAttachment> {
        const room = await this.repository.findRoomForUser(command.roomId, command.userId);

        if (!room) {
            throw new AppError('Chat room not found', 404);
        }

        if (!command.bytes.length) {
            throw new AppError('Attachment content is required', 422);
        }

        const attachment = await this.storage.store({
            roomId: command.roomId,
            userId: command.userId,
            fileName: command.fileName,
            mimeType: command.mimeType,
            bytes: command.bytes,
        });

        await recordChatAudit(this.auditLogger, {
            userId: command.userId,
            action: 'chat.attachment.uploaded',
            entity: 'chat_attachment',
            entityId: command.roomId,
            newValue: {
                roomId: command.roomId,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType ?? null,
                size: attachment.size,
            },
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
        });

        return attachment;
    }
}

async function recordChatAudit(
    auditLogger: ChatAuditLogger | undefined,
    input: ChatAuditLogInput,
) {
    if (!auditLogger) {
        return;
    }

    try {
        await auditLogger.record(input);
    } catch (error) {
        console.warn('[chat-audit] audit logger failed', {
            action: input.action,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function notifyChatRecipients(
    messageNotifier: ChatMessageNotifier | undefined,
    message: ChatMessage,
    recipientIds: string[],
) {
    if (!messageNotifier || recipientIds.length === 0) {
        return;
    }

    try {
        await messageNotifier.notifyIncomingMessage({ message, recipientIds });
    } catch (error) {
        console.warn('[chat-notification] unable to notify recipients', {
            roomId: message.roomId,
            messageId: message.id,
            recipientIds,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
