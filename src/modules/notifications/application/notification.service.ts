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
    resolveNotificationEventLink,
    SendTypedNotificationInput,
    TypedNotificationResult,
} from '../domain/notification-events';
import { NotificationEmailService } from '../domain/notification-email.service';
import { NotificationRepository } from '../domain/notification.repository';

const publicPaths = new Set([
    '/',
    '/public',
    '/about',
    '/departments',
    '/doctors',
    '/services',
    '/book-appointment',
    '/contact',
]);

function cleanPath(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const [pathname, suffix = ''] = normalized.split(/([?#].*)/, 2);
    const trimmed = pathname.replace(/\/+$/, '') || '/';

    return `${trimmed}${suffix}`;
}

function pathOnly(path: string) {
    return cleanPath(path).split(/[?#]/, 1)[0];
}

function detailIdFromPath(pathname: string) {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments.at(-1);

    if (!last || ['appointments', 'billing', 'contact', 'items', 'lab-reviews', 'orders', 'prescriptions'].includes(last)) {
        return '';
    }

    return last;
}

function pathFromLink(link?: string | null) {
    const trimmed = link?.trim();
    if (!trimmed || trimmed.startsWith('//')) return null;

    try {
        const url = new URL(trimmed, 'https://medsphere.local');
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

        return cleanPath(`${url.pathname}${url.search}${url.hash}`);
    } catch {
        return cleanPath(trimmed);
    }
}

function fallbackLinkForType(type: string) {
    const normalized = type.toLowerCase();

    if (normalized === 'lab.results.completed') return '/doctor/lab-reviews';
    if (normalized.includes('lab')) return '/patient/lab-results';
    if (normalized.includes('completed_report')) return '/patient/medical-records';
    if (normalized.includes('appointment.doctor_reminder')) return '/doctor';
    if (normalized.includes('appointment')) return '/patient/appointments';
    if (normalized.includes('billing') || normalized.includes('invoice')) return '/patient/billing';
    if (normalized.includes('prescription') || normalized.includes('pharmacy')) return '/patient/prescriptions';
    if (normalized.includes('inventory') || normalized.includes('stock')) return '/admin/inventory';
    if (normalized.includes('feedback')) return '/doctor/feedback';
    if (normalized.includes('contact')) return '/admin/contact';
    if (normalized.includes('chat') || normalized.includes('message')) return '/messages';

    return null;
}

function normalizeDashboardLink(path: string, type: string) {
    const pathname = pathOnly(path);

    if (publicPaths.has(pathname) || pathname.startsWith('/public/')) {
        return fallbackLinkForType(type);
    }

    if (pathname === '/dashboard') return fallbackLinkForType(type) ?? '/admin';
    if (pathname === '/dashboard/doctor') return '/doctor';
    if (pathname === '/dashboard/nurse') return '/nurse';
    if (pathname === '/dashboard/lab') return '/lab';
    if (pathname === '/dashboard/pharmacy') return '/pharmacy';
    if (pathname === '/dashboard/reception') return '/receptionist';
    if (pathname === '/dashboard/patient') return '/patient';
    if (pathname.startsWith('/dashboard/admin/')) return cleanPath(path.replace(/^\/dashboard\/admin/, '/admin'));
    if (pathname.startsWith('/dashboard/')) return cleanPath(path.replace(/^\/dashboard/, '/admin'));

    if (pathname === '/appointments' || pathname.startsWith('/appointments/')) {
        return fallbackLinkForType(type) ?? '/patient/appointments';
    }

    if (pathname === '/admin/appointments' || pathname.startsWith('/admin/appointments/')) {
        return '/admin/search/appointments';
    }

    if (pathname === '/doctor/appointments' || pathname.startsWith('/doctor/appointments/')) {
        const appointmentId = detailIdFromPath(pathname);
        return appointmentId ? `/doctor/consultations/${appointmentId}` : '/doctor';
    }

    if (pathname.startsWith('/patient/appointments/')) return '/patient/appointments';
    if (pathname.startsWith('/receptionist/appointments/')) return '/receptionist/appointments';
    if (pathname.startsWith('/admin/billing/')) return '/admin/billing';
    if (pathname.startsWith('/patient/billing/')) return '/patient/billing';
    if (pathname.startsWith('/receptionist/billing/')) return '/receptionist/billing';
    if (pathname.startsWith('/patient/prescriptions/')) return '/patient/prescriptions';
    if (pathname.startsWith('/doctor/prescriptions')) return '/doctor';
    if (pathname.startsWith('/prescriptions')) return fallbackLinkForType(type) ?? '/patient/prescriptions';
    if (pathname.startsWith('/patient/lab-results/')) return '/patient/lab-results';
    if (pathname.startsWith('/patient/medical-records/')) return '/patient/medical-records';
    if (pathname.startsWith('/lab/orders')) return '/lab';
    if (pathname.startsWith('/admin/inventory/items')) return '/admin/inventory';
    if (pathname.startsWith('/admin/contact/')) return '/admin/contact';
    if (pathname.startsWith('/admin/feedback/')) return '/admin/feedback';

    if (
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        pathname === '/patient' ||
        pathname.startsWith('/patient/') ||
        pathname === '/doctor' ||
        pathname.startsWith('/doctor/') ||
        pathname === '/nurse' ||
        pathname.startsWith('/nurse/') ||
        pathname === '/lab' ||
        pathname.startsWith('/lab/') ||
        pathname === '/pharmacy' ||
        pathname.startsWith('/pharmacy/') ||
        pathname === '/receptionist' ||
        pathname.startsWith('/receptionist/') ||
        pathname === '/messages' ||
        pathname.startsWith('/messages/')
    ) {
        return path;
    }

    return fallbackLinkForType(type);
}

function normalizeInAppLink(link: string | null | undefined, type: string) {
    const path = pathFromLink(link);
    if (!path) return null;

    return normalizeDashboardLink(path, type);
}

export class NotificationService {
    constructor(
        private readonly repository: NotificationRepository,
        private readonly emailService: NotificationEmailService,
        private readonly activityService?: ActivityService,
    ) {}

    async create(input: CreateNotificationInput): Promise<Notification> {
        const channels = this.normalizeChannels(input.channels);
        const link = normalizeInAppLink(input.link, input.type);

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
        const explicitLink = Object.prototype.hasOwnProperty.call(input, 'link')
            ? input.link ?? null
            : undefined;
        const link = explicitLink ?? rendered.link ?? null;

        this.validateTypedRecipients(input.recipients, definition);

        const notifications: Notification[] = [];
        let emailOnlyCount = 0;

        for (const recipient of input.recipients) {
            const recipientLink =
                recipient.link ??
                resolveNotificationEventLink(input.type, data, recipient.role, explicitLink);

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
