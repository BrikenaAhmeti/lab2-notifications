import { Notification } from './notification.entity';

export interface PushNotificationService {
    send(notification: Notification): Promise<void>;
}
