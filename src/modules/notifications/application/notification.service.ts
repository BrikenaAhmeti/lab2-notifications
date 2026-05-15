import { notificationGateway } from '../../../socket/notification.gateway';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    CreateNotificationInput,
    ListNotificationsInput,
    Notification,
    NotificationChannel,
    PaginatedNotifications,
} from '../domain/notification.entity';
import { NotificationEmailService } from '../domain/notification-email.service';
import { NotificationRepository } from '../domain/notification.repository';

export class NotificationService {
    constructor(
        private readonly repository: NotificationRepository,
        private readonly emailService: NotificationEmailService,
    ) {}

    async create(input: CreateNotificationInput): Promise<Notification> {
        const channels = this.normalizeChannels(input.channels);
        const notification = await this.repository.create({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link ?? null,
            channels,
        });

        notificationGateway.emitNew(notification);

        if (channels.includes('email')) {
            await this.emailService.sendNotification(notification, input.recipientEmail);
        }

        return notification;
    }

    list(input: ListNotificationsInput): Promise<PaginatedNotifications> {
        return this.repository.list(input);
    }

    async markRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.repository.markRead(id, userId);
        notificationGateway.emitRead(userId, notification);

        return notification;
    }

    async markAllRead(userId: string) {
        const count = await this.repository.markAllRead(userId);
        notificationGateway.emitAllRead(userId, count);

        return { count };
    }

    delete(id: string, userId: string): Promise<void> {
        return this.repository.delete(id, userId);
    }

    private normalizeChannels(channels?: NotificationChannel[]): NotificationChannel[] {
        const next: NotificationChannel[] = channels?.length ? channels : ['in_app'];
        const unique = [...new Set(next)];

        if (!unique.includes('in_app')) {
            throw new AppError('Notification must include the in_app channel', 422);
        }

        return unique;
    }
}
