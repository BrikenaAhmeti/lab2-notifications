import {
    CreateNotificationInput,
    ListNotificationsInput,
    Notification,
    PaginatedNotifications,
} from './notification.entity';

export interface NotificationRepository {
    create(input: Omit<Required<CreateNotificationInput>, 'recipientEmail'>): Promise<Notification>;
    list(input: ListNotificationsInput): Promise<PaginatedNotifications>;
    findForUser(id: string, userId: string): Promise<Notification | null>;
    markRead(id: string, userId: string): Promise<Notification>;
    markAllRead(userId: string): Promise<number>;
    delete(id: string, userId: string): Promise<void>;
}
