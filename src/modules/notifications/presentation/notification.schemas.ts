import { z } from 'zod';

import { notificationChannels } from '../domain/notification.entity';

export const sendNotificationSchema = z.object({
    userId: z.uuid(),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(2000),
    link: z.string().url().optional().nullable(),
    channels: z.array(z.enum(notificationChannels)).nonempty().default(['in_app']),
    recipientEmail: z.email().optional(),
});

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
