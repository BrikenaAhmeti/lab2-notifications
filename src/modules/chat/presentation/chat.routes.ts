import express, { Router } from 'express';

import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { env } from '../../../config/env';
import { getMongoDb } from '../../../infrastructure/mongo/mongo';
import { authenticate } from '../../../shared/middleware/authenticate';
import {
    CreateDirectChatRoomHandler,
    MarkChatRoomReadHandler,
    SendChatMessageHandler,
    StoreChatAttachmentHandler,
} from '../application/chat.commands';
import {
    ListChatMessagesHandler,
    ListChatRoomsHandler,
} from '../application/chat.queries';
import { LocalChatAttachmentStorage } from '../infrastructure/local-chat-attachment.storage';
import { AuthAuditLogClient } from '../infrastructure/auth-audit-log.client';
import { AuthUserDirectoryClient } from '../infrastructure/auth-user-directory.client';
import { MongoChatRepository } from '../infrastructure/mongo-chat.repository';
import { NotificationChatMessageNotifier } from '../infrastructure/notification-chat-message-notifier';
import { pushNotificationService } from '../../notifications/presentation/notification.routes';
import { ChatController } from './chat.controller';

const repository = new MongoChatRepository(getMongoDb);
const participantDirectory = new AuthUserDirectoryClient();
const auditLogger = new AuthAuditLogClient();
const messageNotifier = new NotificationChatMessageNotifier(pushNotificationService);
const attachmentStorage = new LocalChatAttachmentStorage(
    env.chat.uploadDir,
    env.chat.publicBaseUrl,
);
const handlers = {
    createDirectRoom: new CreateDirectChatRoomHandler(repository, auditLogger),
    listRooms: new ListChatRoomsHandler(repository, participantDirectory),
    listMessages: new ListChatMessagesHandler(repository),
    sendMessage: new SendChatMessageHandler(repository, auditLogger, messageNotifier),
    markRead: new MarkChatRoomReadHandler(repository, auditLogger),
    storeAttachment: new StoreChatAttachmentHandler(repository, attachmentStorage, auditLogger),
};
const controller = new ChatController(new CommandBus(), new QueryBus(), handlers);

export const chatRoutes = Router();

chatRoutes.get('/rooms', authenticate, controller.listRooms);
chatRoutes.post('/rooms', authenticate, controller.createDirectRoom);
chatRoutes.get('/rooms/:roomId/messages', authenticate, controller.listMessages);
chatRoutes.post('/rooms/:roomId/messages', authenticate, controller.sendMessage);
chatRoutes.patch('/rooms/:roomId/read', authenticate, controller.markRead);
chatRoutes.post(
    '/rooms/:roomId/upload',
    authenticate,
    express.raw({
        type: ['application/octet-stream', 'image/*', 'application/pdf'],
        limit: '10mb',
    }),
    controller.uploadAttachment,
);
