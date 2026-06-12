"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const notification_gateway_1 = require("../../../socket/notification.gateway");
const app_error_1 = require("../../../shared/core/errors/app-error");
const notification_events_1 = require("../domain/notification-events");
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
function cleanPath(path) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const [pathname, suffix = ''] = normalized.split(/([?#].*)/, 2);
    const trimmed = pathname.replace(/\/+$/, '') || '/';
    return `${trimmed}${suffix}`;
}
function pathOnly(path) {
    return cleanPath(path).split(/[?#]/, 1)[0];
}
function detailIdFromPath(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments.at(-1);
    if (!last || ['appointments', 'billing', 'contact', 'items', 'lab-reviews', 'orders', 'prescriptions'].includes(last)) {
        return '';
    }
    return last;
}
function pathFromLink(link) {
    const trimmed = link?.trim();
    if (!trimmed || trimmed.startsWith('//'))
        return null;
    try {
        const url = new URL(trimmed, 'https://medsphere.local');
        if (url.protocol !== 'http:' && url.protocol !== 'https:')
            return null;
        return cleanPath(`${url.pathname}${url.search}${url.hash}`);
    }
    catch {
        return cleanPath(trimmed);
    }
}
function fallbackLinkForType(type) {
    const normalized = type.toLowerCase();
    if (normalized === 'lab.results.completed')
        return '/doctor/lab-reviews';
    if (normalized.includes('lab'))
        return '/patient/lab-results';
    if (normalized.includes('completed_report'))
        return '/patient/medical-records';
    if (normalized.includes('appointment.doctor_reminder'))
        return '/doctor';
    if (normalized.includes('appointment'))
        return '/patient/appointments';
    if (normalized.includes('billing') || normalized.includes('invoice'))
        return '/patient/billing';
    if (normalized.includes('prescription') || normalized.includes('pharmacy'))
        return '/patient/prescriptions';
    if (normalized.includes('inventory') || normalized.includes('stock'))
        return '/admin/inventory';
    if (normalized.includes('feedback'))
        return '/doctor/feedback';
    if (normalized.includes('contact'))
        return '/admin/contact';
    if (normalized.includes('chat') || normalized.includes('message'))
        return '/messages';
    return null;
}
function normalizeDashboardLink(path, type) {
    const pathname = pathOnly(path);
    if (publicPaths.has(pathname) || pathname.startsWith('/public/')) {
        return fallbackLinkForType(type);
    }
    if (pathname === '/dashboard')
        return fallbackLinkForType(type) ?? '/admin';
    if (pathname === '/dashboard/doctor')
        return '/doctor';
    if (pathname === '/dashboard/nurse')
        return '/nurse';
    if (pathname === '/dashboard/lab')
        return '/lab';
    if (pathname === '/dashboard/pharmacy')
        return '/pharmacy';
    if (pathname === '/dashboard/reception')
        return '/receptionist';
    if (pathname === '/dashboard/patient')
        return '/patient';
    if (pathname.startsWith('/dashboard/admin/'))
        return cleanPath(path.replace(/^\/dashboard\/admin/, '/admin'));
    if (pathname.startsWith('/dashboard/'))
        return cleanPath(path.replace(/^\/dashboard/, '/admin'));
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
    if (pathname.startsWith('/patient/appointments/'))
        return '/patient/appointments';
    if (pathname.startsWith('/receptionist/appointments/'))
        return '/receptionist/appointments';
    if (pathname.startsWith('/admin/billing/'))
        return '/admin/billing';
    if (pathname.startsWith('/patient/billing/'))
        return '/patient/billing';
    if (pathname.startsWith('/receptionist/billing/'))
        return '/receptionist/billing';
    if (pathname.startsWith('/patient/prescriptions/'))
        return '/patient/prescriptions';
    if (pathname.startsWith('/doctor/prescriptions'))
        return '/doctor';
    if (pathname.startsWith('/prescriptions'))
        return fallbackLinkForType(type) ?? '/patient/prescriptions';
    if (pathname.startsWith('/patient/lab-results/'))
        return '/patient/lab-results';
    if (pathname.startsWith('/patient/medical-records/'))
        return '/patient/medical-records';
    if (pathname.startsWith('/lab/orders'))
        return '/lab';
    if (pathname.startsWith('/admin/inventory/items'))
        return '/admin/inventory';
    if (pathname.startsWith('/admin/contact/'))
        return '/admin/contact';
    if (pathname.startsWith('/admin/feedback/'))
        return '/admin/feedback';
    if (pathname === '/admin' ||
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
        pathname.startsWith('/messages/')) {
        return path;
    }
    return fallbackLinkForType(type);
}
function normalizeInAppLink(link, type) {
    const path = pathFromLink(link);
    if (!path)
        return null;
    return normalizeDashboardLink(path, type);
}
class NotificationService {
    repository;
    emailService;
    activityService;
    pushTokenRepository;
    pushNotificationService;
    constructor(repository, emailService, activityService, pushTokenRepository, pushNotificationService) {
        this.repository = repository;
        this.emailService = emailService;
        this.activityService = activityService;
        this.pushTokenRepository = pushTokenRepository;
        this.pushNotificationService = pushNotificationService;
    }
    async create(input) {
        const channels = this.normalizeChannels(input.channels);
        const link = normalizeInAppLink(input.link, input.type);
        if (input.dedupeByTypeAndLink && link) {
            const existing = await this.repository.findByUserTypeAndLink(input.userId, input.type, link);
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
        notification_gateway_1.notificationGateway.emitNew(notification);
        await this.sendPush(notification);
        if (channels.includes('email')) {
            await this.emailService.sendNotification(notification, input.recipientEmail);
        }
        return notification;
    }
    async sendTyped(input) {
        const data = input.data ?? {};
        const definition = notification_events_1.notificationEventDefinitions[input.type];
        const rendered = (0, notification_events_1.renderNotificationEvent)(input.type, data);
        const title = input.title ?? rendered.title;
        const message = input.message ?? rendered.message;
        const explicitLink = Object.prototype.hasOwnProperty.call(input, 'link')
            ? input.link ?? null
            : undefined;
        const link = explicitLink ?? rendered.link ?? null;
        this.validateTypedRecipients(input.recipients, definition);
        const notifications = [];
        let emailOnlyCount = 0;
        for (const recipient of input.recipients) {
            const recipientLink = recipient.link ??
                (0, notification_events_1.resolveNotificationEventLink)(input.type, data, recipient.role, explicitLink);
            if (definition.channels.includes('in_app')) {
                const notification = await this.create({
                    userId: recipient.userId,
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
            await this.emailService.sendNotification({
                type: input.type,
                title,
                message,
                link: recipientLink,
            }, recipient.email);
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
    list(input) {
        return this.repository.list(input);
    }
    async markRead(id, userId) {
        const notification = await this.repository.markRead(id, userId);
        notification_gateway_1.notificationGateway.emitRead(userId, notification);
        return notification;
    }
    async markAllRead(userId) {
        const count = await this.repository.markAllRead(userId);
        notification_gateway_1.notificationGateway.emitAllRead(userId, count);
        return { count };
    }
    delete(id, userId) {
        return this.repository.delete(id, userId);
    }
    async registerPushToken(input) {
        await this.pushTokenRepository?.register(input);
    }
    async unregisterPushToken(userId, token) {
        await this.pushTokenRepository?.unregister(userId, token);
    }
    scheduleTestPush(userId, delaySeconds) {
        setTimeout(() => {
            void this.create({
                userId,
                type: 'push.test',
                title: 'MedSphere notification',
                message: 'Push notifications are working on this device.',
                link: '/patient',
            }).catch((error) => {
                console.warn('[push] unable to create test notification', {
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }, delaySeconds * 1000);
    }
    async sendPush(notification) {
        if (!this.pushNotificationService)
            return;
        try {
            await this.pushNotificationService.send(notification);
        }
        catch (error) {
            console.warn('[push] delivery failed', {
                notificationId: notification.id,
                userId: notification.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    normalizeChannels(channels) {
        const next = channels?.length ? channels : ['in_app'];
        const unique = [...new Set(next)];
        if (!unique.includes('in_app')) {
            throw new app_error_1.AppError('Notification must include the in_app channel', 422);
        }
        return unique;
    }
    validateTypedRecipients(recipients, definition) {
        for (const recipient of recipients) {
            if (!definition.recipientRoles.includes(recipient.role)) {
                throw new app_error_1.AppError(`${recipient.role} is not a valid recipient for this notification type`, 422);
            }
            if (definition.channels.includes('in_app') && !recipient.userId) {
                throw new app_error_1.AppError('In-app notification recipients require userId', 422);
            }
            if (definition.channels.includes('email') && !recipient.email) {
                throw new app_error_1.AppError('Email notification recipients require email', 422);
            }
        }
        for (const role of definition.recipientRoles) {
            if (!recipients.some((recipient) => recipient.role === role)) {
                throw new app_error_1.AppError(`Missing ${role} recipient`, 422);
            }
        }
    }
}
exports.NotificationService = NotificationService;
