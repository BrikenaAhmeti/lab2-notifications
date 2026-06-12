"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreChatAttachmentHandler = exports.MarkChatRoomReadHandler = exports.SendChatMessageHandler = exports.CreateDirectChatRoomHandler = exports.StoreChatAttachmentCommand = exports.MarkChatRoomReadCommand = exports.SendChatMessageCommand = exports.CreateDirectChatRoomCommand = void 0;
const chat_gateway_1 = require("../../../socket/chat.gateway");
const app_error_1 = require("../../../shared/core/errors/app-error");
const chat_access_policy_1 = require("../domain/chat-access-policy");
class CreateDirectChatRoomCommand {
    currentUser;
    participantId;
    participantRole;
    ipAddress;
    userAgent;
    constructor(currentUser, participantId, participantRole, ipAddress, userAgent) {
        this.currentUser = currentUser;
        this.participantId = participantId;
        this.participantRole = participantRole;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }
}
exports.CreateDirectChatRoomCommand = CreateDirectChatRoomCommand;
class SendChatMessageCommand {
    roomId;
    senderId;
    content;
    type;
    fileUrl;
    ipAddress;
    userAgent;
    constructor(roomId, senderId, content, type, fileUrl, ipAddress, userAgent) {
        this.roomId = roomId;
        this.senderId = senderId;
        this.content = content;
        this.type = type;
        this.fileUrl = fileUrl;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }
}
exports.SendChatMessageCommand = SendChatMessageCommand;
class MarkChatRoomReadCommand {
    roomId;
    userId;
    ipAddress;
    userAgent;
    constructor(roomId, userId, ipAddress, userAgent) {
        this.roomId = roomId;
        this.userId = userId;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }
}
exports.MarkChatRoomReadCommand = MarkChatRoomReadCommand;
class StoreChatAttachmentCommand {
    roomId;
    userId;
    fileName;
    mimeType;
    bytes;
    ipAddress;
    userAgent;
    constructor(roomId, userId, fileName, mimeType, bytes, ipAddress, userAgent) {
        this.roomId = roomId;
        this.userId = userId;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.bytes = bytes;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }
}
exports.StoreChatAttachmentCommand = StoreChatAttachmentCommand;
class CreateDirectChatRoomHandler {
    repository;
    auditLogger;
    constructor(repository, auditLogger) {
        this.repository = repository;
        this.auditLogger = auditLogger;
    }
    async execute(command) {
        (0, chat_access_policy_1.assertCanCreateDirectRoom)({
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
exports.CreateDirectChatRoomHandler = CreateDirectChatRoomHandler;
class SendChatMessageHandler {
    repository;
    auditLogger;
    constructor(repository, auditLogger) {
        this.repository = repository;
        this.auditLogger = auditLogger;
    }
    async execute(command) {
        const room = await this.repository.findRoomForUser(command.roomId, command.senderId);
        if (!room) {
            throw new app_error_1.AppError('Chat room not found', 404);
        }
        if (command.type === 'text' && !command.content.trim()) {
            throw new app_error_1.AppError('Message content is required', 422);
        }
        if (command.type !== 'text' && !command.fileUrl) {
            throw new app_error_1.AppError('File URL is required for file and image messages', 422);
        }
        const message = await this.repository.createMessage({
            roomId: command.roomId,
            senderId: command.senderId,
            content: command.content.trim(),
            type: command.type,
            fileUrl: command.fileUrl,
        });
        await recordChatAudit(this.auditLogger, {
            userId: command.senderId,
            action: 'chat.message.sent',
            entity: 'chat_message',
            entityId: message.id,
            newValue: {
                roomId: command.roomId,
                messageId: message.id,
                senderId: command.senderId,
                recipientIds: room.participants.filter((participantId) => participantId !== command.senderId),
                type: message.type,
                hasAttachment: Boolean(message.fileUrl),
                contentLength: message.content.length,
            },
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
        });
        chat_gateway_1.chatGateway.emitMessage(room.participants, message);
        return message;
    }
}
exports.SendChatMessageHandler = SendChatMessageHandler;
class MarkChatRoomReadHandler {
    repository;
    auditLogger;
    constructor(repository, auditLogger) {
        this.repository = repository;
        this.auditLogger = auditLogger;
    }
    async execute(command) {
        const room = await this.repository.findRoomForUser(command.roomId, command.userId);
        if (!room) {
            throw new app_error_1.AppError('Chat room not found', 404);
        }
        const result = await this.repository.markRoomRead({
            roomId: command.roomId,
            userId: command.userId,
        });
        if (result.readCount > 0) {
            chat_gateway_1.chatGateway.emitRead(room.participants, {
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
exports.MarkChatRoomReadHandler = MarkChatRoomReadHandler;
class StoreChatAttachmentHandler {
    repository;
    storage;
    auditLogger;
    constructor(repository, storage, auditLogger) {
        this.repository = repository;
        this.storage = storage;
        this.auditLogger = auditLogger;
    }
    async execute(command) {
        const room = await this.repository.findRoomForUser(command.roomId, command.userId);
        if (!room) {
            throw new app_error_1.AppError('Chat room not found', 404);
        }
        if (!command.bytes.length) {
            throw new app_error_1.AppError('Attachment content is required', 422);
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
exports.StoreChatAttachmentHandler = StoreChatAttachmentHandler;
async function recordChatAudit(auditLogger, input) {
    if (!auditLogger) {
        return;
    }
    try {
        await auditLogger.record(input);
    }
    catch (error) {
        console.warn('[chat-audit] audit logger failed', {
            action: input.action,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
