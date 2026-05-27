import { notificationGateway } from '../../../socket/notification.gateway';
import { AppError } from '../../../shared/core/errors/app-error';
import { ActivityService } from '../../dashboard/application/activity.service';
import {
    CreateNotificationInput,
    ListNotificationsInput,
    Notification,
    NotificationChannel,
    PaginatedNotifications,
} from '../domain/notification.entity';
import {
    notificationEventDefinitions,
    NotificationRecipient,
    renderNotificationEvent,
    SendTypedNotificationInput,
    TypedNotificationResult,
} from '../domain/notification-events';
import { NotificationEmailService } from '../domain/notification-email.service';
import { NotificationRepository } from '../domain/notification.repository';

export class NotificationService {
    constructor(
        private readonly repository: NotificationRepository,
        private readonly emailService: NotificationEmailService,
        private readonly activityService?: ActivityService,
    ) {}

    async create(input: CreateNotificationInput): Promise<Notification> {
        const channels = this.normalizeChannels(input.channels);
        const link = input.link ?? null;

        if (input.dedupeByTypeAndLink && link) {
            const existing = await this.repository.findByUserTypeAndLink(
                input.userId,
                input.type,
                link,
            );

            if (existing) {
                return existing;
            }
        }

        const notification = await this.repository.create({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link,
            channels,
        });

        notificationGateway.emitNew(notification);

        if (channels.includes('email')) {
            await this.emailService.sendNotification(notification, input.recipientEmail);
        }

        return notification;
    }

    async sendTyped(input: SendTypedNotificationInput): Promise<TypedNotificationResult> {
        const data = input.data ?? {};
        const definition = notificationEventDefinitions[input.type];
        const rendered = renderNotificationEvent(input.type, data);
        const title = input.title ?? rendered.title;
        const message = input.message ?? rendered.message;
        const link = input.link ?? rendered.link ?? null;

        this.validateTypedRecipients(input.recipients, definition);

        const notifications: Notification[] = [];
        let emailOnlyCount = 0;

        for (const recipient of input.recipients) {
            const recipientLink = recipient.link ?? link;

            if (definition.channels.includes('in_app')) {
                const notification = await this.create({
                    userId: recipient.userId as string,
                    type: input.type,
                    title,
                    message,
                    link: recipientLink,
                    channels: [...definition.channels],
                    recipientEmail: recipient.email,
                    dedupeByTypeAndLink: input.dedupeByTypeAndLink,
                });

                notifications.push(notification);
                continue;
            }

            await this.emailService.sendNotification(
                {
                    type: input.type,
                    title,
                    message,
                    link: recipientLink,
                },
                recipient.email,
            );
            emailOnlyCount += 1;
        }

        await this.activityService?.recordNotificationEvent({
            type: input.type,
            data,
            fallbackDescription: message,
            fallbackEntityLink: link,
        });

        return { notifications, emailOnlyCount };
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

    private validateTypedRecipients(
        recipients: NotificationRecipient[],
        definition: {
            channels: readonly NotificationChannel[];
            recipientRoles: readonly NotificationRecipient['role'][];
        },
    ) {
        for (const recipient of recipients) {
            if (!definition.recipientRoles.includes(recipient.role)) {
                throw new AppError(
                    `${recipient.role} is not a valid recipient for this notification type`,
                    422,
                );
            }

            if (definition.channels.includes('in_app') && !recipient.userId) {
                throw new AppError('In-app notification recipients require userId', 422);
            }

            if (definition.channels.includes('email') && !recipient.email) {
                throw new AppError('Email notification recipients require email', 422);
            }
        }

        for (const role of definition.recipientRoles) {
            if (!recipients.some((recipient) => recipient.role === role)) {
                throw new AppError(`Missing ${role} recipient`, 422);
            }
        }
    }
}
