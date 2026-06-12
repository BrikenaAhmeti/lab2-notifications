"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaNotificationRepository = void 0;
const app_error_1 = require("../../../shared/core/errors/app-error");
const notification_entity_1 = require("../domain/notification.entity");
const notificationInclude = {
    channels: {
        select: {
            channel: true,
        },
    },
};
const channelOrder = new Map(notification_entity_1.notificationChannels.map((channel, index) => [channel, index]));
function toChannelRows(channels) {
    return channels.map((channel) => ({ channel }));
}
function sortChannels(channels) {
    return channels.sort((left, right) => (channelOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (channelOrder.get(right) ?? Number.MAX_SAFE_INTEGER));
}
class PrismaNotificationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
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
    async findByUserTypeAndLink(userId, type, link) {
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
    async list(input) {
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
    async findForUser(id, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
            include: notificationInclude,
        });
        return notification ? this.toEntity(notification) : null;
    }
    async markRead(id, userId) {
        const notification = await this.findForUser(id, userId);
        if (!notification) {
            throw new app_error_1.AppError('Notification not found', 404);
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
    async markAllRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return result.count;
    }
    async delete(id, userId) {
        const notification = await this.findForUser(id, userId);
        if (!notification) {
            throw new app_error_1.AppError('Notification not found', 404);
        }
        await this.prisma.notification.delete({ where: { id } });
    }
    toEntity(notification) {
        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            channels: sortChannels(notification.channels.map(({ channel }) => channel)),
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
        };
    }
}
exports.PrismaNotificationRepository = PrismaNotificationRepository;
