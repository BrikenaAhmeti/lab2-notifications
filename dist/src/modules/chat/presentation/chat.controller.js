"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const app_error_1 = require("../../../shared/core/errors/app-error");
const chat_commands_1 = require("../application/chat.commands");
const chat_queries_1 = require("../application/chat.queries");
const chat_schemas_1 = require("./chat.schemas");
class ChatController {
    commandBus;
    queryBus;
    handlers;
    constructor(commandBus, queryBus, handlers) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
        this.handlers = handlers;
    }
    createDirectRoom = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const body = chat_schemas_1.createDirectChatRoomSchema.parse(req.body);
            const room = await this.commandBus.execute(this.handlers.createDirectRoom, new chat_commands_1.CreateDirectChatRoomCommand(user, body.participantId, body.participantRole, req.ip, req.get('user-agent')));
            return res.status(201).json({ data: room });
        }
        catch (error) {
            return next(error);
        }
    };
    listRooms = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const query = chat_schemas_1.chatPaginationQuerySchema.parse(req.query);
            const result = await this.queryBus.execute(this.handlers.listRooms, new chat_queries_1.ListChatRoomsQuery(user.id, query.page, query.limit));
            return res.json(result);
        }
        catch (error) {
            return next(error);
        }
    };
    listMessages = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chat_schemas_1.chatRoomParamsSchema.parse(req.params);
            const query = chat_schemas_1.chatPaginationQuerySchema.parse(req.query);
            const result = await this.queryBus.execute(this.handlers.listMessages, new chat_queries_1.ListChatMessagesQuery(roomId, user.id, query.page, query.limit));
            return res.json(result);
        }
        catch (error) {
            return next(error);
        }
    };
    sendMessage = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chat_schemas_1.chatRoomParamsSchema.parse(req.params);
            const body = chat_schemas_1.sendChatMessageSchema.parse(req.body);
            const message = await this.commandBus.execute(this.handlers.sendMessage, new chat_commands_1.SendChatMessageCommand(roomId, user.id, body.content, body.type, body.fileUrl ?? null, req.ip, req.get('user-agent')));
            return res.status(201).json({ data: message });
        }
        catch (error) {
            return next(error);
        }
    };
    markRead = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chat_schemas_1.chatRoomParamsSchema.parse(req.params);
            const result = await this.commandBus.execute(this.handlers.markRead, new chat_commands_1.MarkChatRoomReadCommand(roomId, user.id, req.ip, req.get('user-agent')));
            return res.json({ data: result });
        }
        catch (error) {
            return next(error);
        }
    };
    uploadAttachment = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { roomId } = chat_schemas_1.chatRoomParamsSchema.parse(req.params);
            const upload = this.getUploadInput(req);
            const attachment = await this.commandBus.execute(this.handlers.storeAttachment, new chat_commands_1.StoreChatAttachmentCommand(roomId, user.id, upload.fileName, upload.mimeType, upload.bytes, req.ip, req.get('user-agent')));
            return res.status(201).json({ data: attachment });
        }
        catch (error) {
            return next(error);
        }
    };
    getUser(req) {
        if (!req.user) {
            throw new app_error_1.AppError('Authentication required', 401);
        }
        return req.user;
    }
    getUploadInput(req) {
        if (Buffer.isBuffer(req.body)) {
            const fileName = req.header('x-file-name');
            if (!fileName) {
                throw new app_error_1.AppError('x-file-name header is required', 422);
            }
            return {
                fileName,
                mimeType: req.header('content-type') ?? undefined,
                bytes: req.body,
            };
        }
        const body = chat_schemas_1.chatAttachmentJsonSchema.parse(req.body);
        const bytes = Buffer.from(body.contentBase64, 'base64');
        return {
            fileName: body.fileName,
            mimeType: body.mimeType,
            bytes,
        };
    }
}
exports.ChatController = ChatController;
