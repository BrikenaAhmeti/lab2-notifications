import { z } from 'zod';

import { notificationChannels } from '../domain/notification.entity';
import {
    notificationEventTypes,
    notificationRecipientRoles,
} from '../domain/notification-events';

function isNotificationLink(value: string) {
    if (value.startsWith('/') && !value.startsWith('//')) {
        return true;
    }

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}

const notificationLinkSchema = z
    .string()
    .trim()
    .min(1)
    .refine(isNotificationLink);

const legacySendNotificationSchema = z.object({
    userId: z.uuid(),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(2000),
    link: notificationLinkSchema.optional().nullable(),
    channels: z.array(z.enum(notificationChannels)).nonempty().default(['in_app']),
    recipientEmail: z.email().optional(),
    dedupeByTypeAndLink: z.boolean().optional(),
});

const typedNotificationRecipientSchema = z.object({
    role: z.enum(notificationRecipientRoles),
    userId: z.uuid().optional(),
    email: z.email().optional(),
    link: notificationLinkSchema.optional().nullable(),
});

const typedSendNotificationSchema = z
    .object({
        type: z.enum(notificationEventTypes),
        recipients: z.array(typedNotificationRecipientSchema).nonempty(),
        data: z.record(z.string(), z.unknown()).default({}),
        title: z.string().trim().min(1).max(160).optional(),
        message: z.string().trim().min(1).max(2000).optional(),
        link: notificationLinkSchema.optional().nullable(),
        dedupeByTypeAndLink: z.boolean().optional(),
    })
    .strict();

export const sendNotificationSchema = z.union([
    typedSendNotificationSchema,
    legacySendNotificationSchema,
]);

export const listNotificationsQuerySchema = z.object({
    isRead: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => (value === undefined ? undefined : value === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationIdParamsSchema = z.object({
    id: z.uuid(),
});
