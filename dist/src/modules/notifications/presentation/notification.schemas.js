"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPushSchema = exports.unregisterPushTokenSchema = exports.registerPushTokenSchema = exports.notificationIdParamsSchema = exports.listNotificationsQuerySchema = exports.sendNotificationSchema = void 0;
const zod_1 = require("zod");
const notification_entity_1 = require("../domain/notification.entity");
const notification_events_1 = require("../domain/notification-events");
function isNotificationLink(value) {
    if (value.startsWith('/') && !value.startsWith('//')) {
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
const notificationLinkSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .refine(isNotificationLink);
const legacySendNotificationSchema = zod_1.z.object({
    userId: zod_1.z.uuid(),
    type: zod_1.z.string().trim().min(1),
    title: zod_1.z.string().trim().min(1).max(160),
    message: zod_1.z.string().trim().min(1).max(2000),
    link: notificationLinkSchema.optional().nullable(),
    channels: zod_1.z.array(zod_1.z.enum(notification_entity_1.notificationChannels)).nonempty().default(['in_app']),
    recipientEmail: zod_1.z.email().optional(),
    dedupeByTypeAndLink: zod_1.z.boolean().optional(),
});
const typedNotificationRecipientSchema = zod_1.z.object({
    role: zod_1.z.enum(notification_events_1.notificationRecipientRoles),
    userId: zod_1.z.uuid().optional(),
    email: zod_1.z.email().optional(),
    link: notificationLinkSchema.optional().nullable(),
});
const typedSendNotificationSchema = zod_1.z
    .object({
    type: zod_1.z.enum(notification_events_1.notificationEventTypes),
    recipients: zod_1.z.array(typedNotificationRecipientSchema).nonempty(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    title: zod_1.z.string().trim().min(1).max(160).optional(),
    message: zod_1.z.string().trim().min(1).max(2000).optional(),
    link: notificationLinkSchema.optional().nullable(),
    dedupeByTypeAndLink: zod_1.z.boolean().optional(),
})
    .strict();
exports.sendNotificationSchema = zod_1.z.union([
    typedSendNotificationSchema,
    legacySendNotificationSchema,
]);
exports.listNotificationsQuerySchema = zod_1.z.object({
    isRead: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => (value === undefined ? undefined : value === 'true')),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.notificationIdParamsSchema = zod_1.z.object({
    id: zod_1.z.uuid(),
});
exports.registerPushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().trim().regex(/^Expo(?:nent)?PushToken\[[^\]]+\]$/),
    platform: zod_1.z.enum(['android', 'ios']),
    deviceName: zod_1.z.string().trim().min(1).max(120).optional(),
});
exports.unregisterPushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().trim().regex(/^Expo(?:nent)?PushToken\[[^\]]+\]$/),
});
exports.testPushSchema = zod_1.z.object({
    delaySeconds: zod_1.z.coerce.number().int().min(0).max(60).default(10),
});
