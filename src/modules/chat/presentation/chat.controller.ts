import { NextFunction, Request, Response } from 'express';

import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { AuthenticatedUser } from '../../../shared/core/types/request-with-user';
import {
    CreateDirectChatRoomCommand,
    CreateDirectChatRoomHandler,
    MarkChatRoomReadCommand,
    MarkChatRoomReadHandler,
    SendChatMessageCommand,
    SendChatMessageHandler,
    StoreChatAttachmentCommand,
    StoreChatAttachmentHandler,
} from '../application/chat.commands';
import {
    ListChatMessagesHandler,
    ListChatMessagesQuery,
    ListChatRoomsHandler,
    ListChatRoomsQuery,
} from '../application/chat.queries';
import {
    chatAttachmentJsonSchema,
    chatPaginationQuerySchema,
    chatRoomParamsSchema,
    createDirectChatRoomSchema,
    sendChatMessageSchema,
} from './chat.schemas';

type ChatControllerHandlers = {
    createDirectRoom: CreateDirectChatRoomHandler;
    listRooms: ListChatRoomsHandler;
    listMessages: ListChatMessagesHandler;
    sendMessage: SendChatMessageHandler;
    markRead: MarkChatRoomReadHandler;
    storeAttachment: StoreChatAttachmentHandler;
};

export class ChatController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly handlers: ChatControllerHandlers,
    ) {}

    createDirectRoom = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const body = createDirectChatRoomSchema.parse(req.body);
            const room = await this.commandBus.execute(
                this.handlers.createDirectRoom,
                new CreateDirectChatRoomCommand(user, body.participantId, body.participantRole),
            );

            return res.status(201).json({ data: room });
        } catch (error) {
            return next(error);
        }
    };

    listRooms = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const query = chatPaginationQuerySchema.parse(req.query);
            const result = await this.queryBus.execute(
                this.handlers.listRooms,
                new ListChatRoomsQuery(user.id, query.page, query.limit),
            );

            return res.json(result);
        } catch (error) {
            return next(error);
        }
    };

    listMessages = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chatRoomParamsSchema.parse(req.params);
            const query = chatPaginationQuerySchema.parse(req.query);
            const result = await this.queryBus.execute(
                this.handlers.listMessages,
                new ListChatMessagesQuery(roomId, user.id, query.page, query.limit),
            );

            return res.json(result);
        } catch (error) {
            return next(error);
        }
    };

    sendMessage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chatRoomParamsSchema.parse(req.params);
            const body = sendChatMessageSchema.parse(req.body);
            const message = await this.commandBus.execute(
                this.handlers.sendMessage,
                new SendChatMessageCommand(
                    roomId,
                    user.id,
                    body.content,
                    body.type,
                    body.fileUrl ?? null,
                ),
            );

            return res.status(201).json({ data: message });
        } catch (error) {
            return next(error);
        }
    };

    markRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chatRoomParamsSchema.parse(req.params);
            const result = await this.commandBus.execute(
                this.handlers.markRead,
                new MarkChatRoomReadCommand(roomId, user.id),
            );

            return res.json({ data: result });
        } catch (error) {
            return next(error);
        }
    };

    uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chatRoomParamsSchema.parse(req.params);
            const upload = this.getUploadInput(req);
            const attachment = await this.commandBus.execute(
                this.handlers.storeAttachment,
                new StoreChatAttachmentCommand(
                    roomId,
                    user.id,
                    upload.fileName,
                    upload.mimeType,
                    upload.bytes,
                ),
            );

            return res.status(201).json({ data: attachment });
        } catch (error) {
            return next(error);
        }
    };

    private getUser(req: Request): AuthenticatedUser {
        if (!req.user) {
            throw new AppError('Authentication required', 401);
        }

        return req.user;
    }

    private getUploadInput(req: Request) {
        if (Buffer.isBuffer(req.body)) {
            const fileName = req.header('x-file-name');

            if (!fileName) {
                throw new AppError('x-file-name header is required', 422);
            }

            return {
                fileName,
                mimeType: req.header('content-type') ?? undefined,
                bytes: req.body,
            };
        }

        const body = chatAttachmentJsonSchema.parse(req.body);
        const bytes = Buffer.from(body.contentBase64, 'base64');

        return {
            fileName: body.fileName,
            mimeType: body.mimeType,
            bytes,
        };
    }
}
