"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = __importStar(require("express"));
const command_bus_1 = require("../../../shared/core/buses/command-bus");
const query_bus_1 = require("../../../shared/core/buses/query-bus");
const env_1 = require("../../../config/env");
const mongo_1 = require("../../../infrastructure/mongo/mongo");
const authenticate_1 = require("../../../shared/middleware/authenticate");
const chat_commands_1 = require("../application/chat.commands");
const chat_queries_1 = require("../application/chat.queries");
const local_chat_attachment_storage_1 = require("../infrastructure/local-chat-attachment.storage");
const auth_audit_log_client_1 = require("../infrastructure/auth-audit-log.client");
const auth_user_directory_client_1 = require("../infrastructure/auth-user-directory.client");
const mongo_chat_repository_1 = require("../infrastructure/mongo-chat.repository");
const chat_controller_1 = require("./chat.controller");
const repository = new mongo_chat_repository_1.MongoChatRepository(mongo_1.getMongoDb);
const participantDirectory = new auth_user_directory_client_1.AuthUserDirectoryClient();
const auditLogger = new auth_audit_log_client_1.AuthAuditLogClient();
const attachmentStorage = new local_chat_attachment_storage_1.LocalChatAttachmentStorage(env_1.env.chat.uploadDir, env_1.env.chat.publicBaseUrl);
const handlers = {
    createDirectRoom: new chat_commands_1.CreateDirectChatRoomHandler(repository, auditLogger),
    listRooms: new chat_queries_1.ListChatRoomsHandler(repository, participantDirectory),
    listMessages: new chat_queries_1.ListChatMessagesHandler(repository),
    sendMessage: new chat_commands_1.SendChatMessageHandler(repository, auditLogger),
    markRead: new chat_commands_1.MarkChatRoomReadHandler(repository, auditLogger),
    storeAttachment: new chat_commands_1.StoreChatAttachmentHandler(repository, attachmentStorage, auditLogger),
};
const controller = new chat_controller_1.ChatController(new command_bus_1.CommandBus(), new query_bus_1.QueryBus(), handlers);
exports.chatRoutes = (0, express_1.Router)();
exports.chatRoutes.get('/rooms', authenticate_1.authenticate, controller.listRooms);
exports.chatRoutes.post('/rooms', authenticate_1.authenticate, controller.createDirectRoom);
exports.chatRoutes.get('/rooms/:roomId/messages', authenticate_1.authenticate, controller.listMessages);
exports.chatRoutes.post('/rooms/:roomId/messages', authenticate_1.authenticate, controller.sendMessage);
exports.chatRoutes.patch('/rooms/:roomId/read', authenticate_1.authenticate, controller.markRead);
exports.chatRoutes.post('/rooms/:roomId/upload', authenticate_1.authenticate, express_1.default.raw({
    type: ['application/octet-stream', 'image/*', 'application/pdf'],
    limit: '10mb',
}), controller.uploadAttachment);
