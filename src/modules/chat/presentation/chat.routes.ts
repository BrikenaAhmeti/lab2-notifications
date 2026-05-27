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
import { MongoChatRepository } from '../infrastructure/mongo-chat.repository';
import { ChatController } from './chat.controller';

const repository = new MongoChatRepository(getMongoDb);
const attachmentStorage = new LocalChatAttachmentStorage(
    env.chat.uploadDir,
    env.chat.publicBaseUrl,
);
const handlers = {
    createDirectRoom: new CreateDirectChatRoomHandler(repository),
    listRooms: new ListChatRoomsHandler(repository),
    listMessages: new ListChatMessagesHandler(repository),
    sendMessage: new SendChatMessageHandler(repository),
    markRead: new MarkChatRoomReadHandler(repository),
    storeAttachment: new StoreChatAttachmentHandler(repository, attachmentStorage),
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
