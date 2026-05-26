import { EmailNotificationContent } from '../../../modules/notifications/domain/notification-email.service';
import {
    notificationEventDefinitions,
    notificationEventTypes,
    NotificationEventType,
} from '../../../modules/notifications/domain/notification-events';

export const notificationTemplateDefinitions = Object.fromEntries(
    notificationEventTypes.map((type) => [
        type,
        { label: notificationEventDefinitions[type].label },
    ]),
) as Record<NotificationEventType, { label: string }>;

export type NotificationTemplateType = keyof typeof notificationTemplateDefinitions;

export function renderNotificationEmail(notification: EmailNotificationContent) {
    const definition =
        notificationTemplateDefinitions[notification.type as NotificationTemplateType];
    const subject = definition?.label ?? notification.title;
    const body = [
        notification.title,
        '',
        notification.message,
        notification.link ? `\nOpen: ${notification.link}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return { subject, text: body };
}
