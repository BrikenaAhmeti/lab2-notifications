import { z } from 'zod';

import { chatMessageTypes, chatParticipantRoles } from '../domain/chat.entity';

function isChatFileUrl(value: string) {
    if (value.startsWith('/uploads/chat/') || (value.startsWith('/') && !value.startsWith('//'))) {
        return true;
    }

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}

const chatFileUrlSchema = z.string().trim().min(1).refine(isChatFileUrl);

export const chatRoomParamsSchema = z.object({
    roomId: z.uuid(),
});

export const createDirectChatRoomSchema = z
    .object({
        participantId: z.uuid(),
        participantRole: z.enum(chatParticipantRoles),
    })
    .strict();

export const chatPaginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sendChatMessageSchema = z
    .object({
        content: z.string().trim().min(1).max(5000),
        type: z.enum(chatMessageTypes).default('text'),
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

export const chatAttachmentJsonSchema = z
    .object({
        fileName: z.string().trim().min(1).max(160),
        mimeType: z.string().trim().min(1).max(120).optional(),
        contentBase64: z.string().trim().min(1),
    })
    .strict();
