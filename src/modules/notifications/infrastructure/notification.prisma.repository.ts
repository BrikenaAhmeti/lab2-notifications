import { Prisma, PrismaClient } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    ListNotificationsInput,
    Notification,
    NotificationChannel,
    notificationChannels,
    PaginatedNotifications,
    PersistNotificationInput,
} from '../domain/notification.entity';
import { NotificationRepository } from '../domain/notification.repository';

const notificationInclude = {
    channels: {
        select: {
            channel: true,
        },
    },
} satisfies Prisma.NotificationInclude;

type PrismaNotification = Prisma.NotificationGetPayload<{
    include: typeof notificationInclude;
}>;

const channelOrder = new Map(
    notificationChannels.map((channel, index) => [channel, index]),
);

function toChannelRows(channels: NotificationChannel[]) {
    return channels.map((channel) => ({ channel }));
}

function sortChannels(channels: NotificationChannel[]) {
    return channels.sort(
        (left, right) =>
            (channelOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
            (channelOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    );
}

export class PrismaNotificationRepository implements NotificationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async create(input: PersistNotificationInput): Promise<Notification> {
        const notification = await this.prisma.notification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                link: input.link,
                channels: {
                    create: toChannelRows(input.channels),
                },
            },
            include: notificationInclude,
        });

        return this.toEntity(notification);
    }

    async findByUserTypeAndLink(
        userId: string,
        type: string,
        link: string,
    ): Promise<Notification | null> {
        const notification = await this.prisma.notification.findFirst({
            where: {
                userId,
                type,
                link,
            },
            orderBy: { createdAt: 'desc' },
            include: notificationInclude,
        });

        return notification ? this.toEntity(notification) : null;
    }

    async list(input: ListNotificationsInput): Promise<PaginatedNotifications> {
        const where = {
            userId: input.userId,
            ...(typeof input.isRead === 'boolean' ? { isRead: input.isRead } : {}),
        };

        const totalItemsPromise = this.prisma.notification.count({ where });
        const unreadCountPromise = input.isRead === false
            ? totalItemsPromise
            : this.prisma.notification.count({
                where: { userId: input.userId, isRead: false },
            });

        const [items, totalItems, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (input.page - 1) * input.limit,
                take: input.limit,
                include: notificationInclude,
            }),
            totalItemsPromise,
            unreadCountPromise,
        ]);

        return {
            data: items.map((item) => this.toEntity(item)),
            meta: {
                page: input.page,
                limit: input.limit,
                totalItems,
                totalPages: Math.ceil(totalItems / input.limit),
                unreadCount,
            },
        };
    }

    async findForUser(id: string, userId: string): Promise<Notification | null> {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
            include: notificationInclude,
        });

        return notification ? this.toEntity(notification) : null;
    }

    async markRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.findForUser(id, userId);

        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        const updated = await this.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: notification.readAt ?? new Date(),
            },
            include: notificationInclude,
        });

        return this.toEntity(updated);
    }

    async markAllRead(userId: string): Promise<number> {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        return result.count;
    }

    async delete(id: string, userId: string): Promise<void> {
        const notification = await this.findForUser(id, userId);

        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        await this.prisma.notification.delete({ where: { id } });
    }

    private toEntity(notification: PrismaNotification): Notification {
        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            channels: sortChannels(
                notification.channels.map(
                    ({ channel }) => channel as NotificationChannel,
                ),
            ),
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
        };
    }
}
