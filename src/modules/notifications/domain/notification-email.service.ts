import { Notification } from './notification.entity';

export type EmailNotificationContent = Pick<
    Notification,
    'type' | 'title' | 'message' | 'link'
>;

export interface NotificationEmailService {
    sendNotification(
        notification: EmailNotificationContent,
        recipientEmail?: string,
    ): Promise<void>;
}
