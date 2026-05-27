export const notificationChannels = ['in_app', 'email'] as const;

export type NotificationChannel = (typeof notificationChannels)[number];

export type Notification = {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    channels: NotificationChannel[];
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
};

export type CreateNotificationInput = {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    channels?: NotificationChannel[];
    recipientEmail?: string;
    dedupeByTypeAndLink?: boolean;
};

export type PersistNotificationInput = {
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    channels: NotificationChannel[];
};

export type ListNotificationsInput = {
    userId: string;
    isRead?: boolean;
    page: number;
    limit: number;
};

export type PaginatedNotifications = {
    data: Notification[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        unreadCount: number;
    };
};
