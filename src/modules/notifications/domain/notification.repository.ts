import {
    ListNotificationsInput,
    Notification,
    PaginatedNotifications,
    PersistNotificationInput,
} from './notification.entity';

export interface NotificationRepository {
    create(input: PersistNotificationInput): Promise<Notification>;
    list(input: ListNotificationsInput): Promise<PaginatedNotifications>;
    findByUserTypeAndLink(
        userId: string,
        type: string,
        link: string,
    ): Promise<Notification | null>;
    findForUser(id: string, userId: string): Promise<Notification | null>;
    markRead(id: string, userId: string): Promise<Notification>;
    markAllRead(userId: string): Promise<number>;
    delete(id: string, userId: string): Promise<void>;
}
