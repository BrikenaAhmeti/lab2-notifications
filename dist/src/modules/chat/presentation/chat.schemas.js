"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAttachmentJsonSchema = exports.sendChatMessageSchema = exports.chatPaginationQuerySchema = exports.createDirectChatRoomSchema = exports.chatRoomParamsSchema = void 0;
const zod_1 = require("zod");
const chat_entity_1 = require("../domain/chat.entity");
function isChatFileUrl(value) {
    if (value.startsWith('/uploads/chat/') || (value.startsWith('/') && !value.startsWith('//'))) {
        return true;
    }
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    }
    catch {
        return false;
    }
}
const chatFileUrlSchema = zod_1.z.string().trim().min(1).refine(isChatFileUrl);
exports.chatRoomParamsSchema = zod_1.z.object({
    roomId: zod_1.z.uuid(),
});
exports.createDirectChatRoomSchema = zod_1.z
    .object({
    participantId: zod_1.z.uuid(),
    participantRole: zod_1.z.enum(chat_entity_1.chatParticipantRoles),
})
    .strict();
exports.chatPaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.sendChatMessageSchema = zod_1.z
    .object({
    content: zod_1.z.string().trim().min(1).max(5000),
    type: zod_1.z.enum(chat_entity_1.chatMessageTypes).default('text'),
    fileUrl: chatFileUrlSchema.optional().nullable(),
})
    .strict()
    .superRefine((value, context) => {
    if (value.type !== 'text' && !value.fileUrl) {
        context.addIssue({
            code: 'custom',
            message: 'fileUrl is required for file and image messages',
            path: ['fileUrl'],
        });
    }
});
exports.chatAttachmentJsonSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().trim().min(1).max(160),
    mimeType: zod_1.z.string().trim().min(1).max(120).optional(),
    contentBase64: zod_1.z.string().trim().min(1),
})
    .strict();
