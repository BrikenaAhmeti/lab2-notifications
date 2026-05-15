import { Notification } from './notification.entity';

export interface NotificationEmailService {
    sendNotification(notification: Notification, recipientEmail?: string): Promise<void>;
}
