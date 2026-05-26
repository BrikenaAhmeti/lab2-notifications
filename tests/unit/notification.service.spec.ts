import { NotificationService } from '../../src/modules/notifications/application/notification.service';
import { Notification } from '../../src/modules/notifications/domain/notification.entity';
import { NotificationEmailService } from '../../src/modules/notifications/domain/notification-email.service';
import { NotificationRepository } from '../../src/modules/notifications/domain/notification.repository';
import { notificationGateway } from '../../src/socket/notification.gateway';

const notification: Notification = {
    id: 'ef151067-b411-4604-b24e-1906393ce833',
    userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
    type: 'appointment.booked',
    title: 'Appointment booked',
    message: 'Your appointment was booked.',
    link: '/patient/appointments/1',
    channels: ['in_app'],
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
};

function createFixture() {
    const repository: jest.Mocked<NotificationRepository> = {
        create: jest.fn().mockImplementation(async (input) => ({
            ...notification,
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
            channels: input.channels,
        })),
        list: jest.fn(),
        findByUserTypeAndLink: jest.fn(),
        findForUser: jest.fn(),
        markRead: jest.fn().mockResolvedValue({ ...notification, isRead: true, readAt: new Date() }),
        markAllRead: jest.fn().mockResolvedValue(3),
        delete: jest.fn(),
    };

    const emailService: jest.Mocked<NotificationEmailService> = {
        sendNotification: jest.fn(),
    };

    return {
        repository,
        emailService,
        service: new NotificationService(repository, emailService),
    };
}

describe('NotificationService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('creates an in-app notification by default', async () => {
        const { repository, emailService, service } = createFixture();
        const emitNew = jest.spyOn(notificationGateway, 'emitNew').mockImplementation();

        const result = await service.create({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
        });

        expect(result).toEqual(expect.objectContaining({
            userId: notification.userId,
            type: notification.type,
            channels: ['in_app'],
        }));
        expect(repository.create).toHaveBeenCalledWith({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: null,
            channels: ['in_app'],
        });
        expect(emailService.sendNotification).not.toHaveBeenCalled();
        expect(emitNew).toHaveBeenCalledWith(expect.objectContaining({
            userId: notification.userId,
            type: notification.type,
        }));
    });

    it('returns an existing notification when type and link dedupe is requested', async () => {
        const { repository, emailService, service } = createFixture();
        const emitNew = jest.spyOn(notificationGateway, 'emitNew').mockImplementation();
        repository.findByUserTypeAndLink.mockResolvedValue(notification);

        const result = await service.create({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            dedupeByTypeAndLink: true,
        });

        expect(result).toBe(notification);
        expect(repository.create).not.toHaveBeenCalled();
        expect(emailService.sendNotification).not.toHaveBeenCalled();
        expect(emitNew).not.toHaveBeenCalled();
    });

    it('sends email when the email channel is requested', async () => {
        const { emailService, service } = createFixture();
        jest.spyOn(notificationGateway, 'emitNew').mockImplementation();

        await service.create({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            channels: ['in_app', 'email'],
            recipientEmail: 'patient@example.com',
        });

        expect(emailService.sendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: notification.userId,
                type: notification.type,
                channels: ['in_app', 'email'],
            }),
            'patient@example.com',
        );
    });

    it('sends typed appointment notifications to the PRD recipients and channels', async () => {
        const { repository, emailService, service } = createFixture();
        const emitNew = jest.spyOn(notificationGateway, 'emitNew').mockImplementation();

        const result = await service.sendTyped({
            type: 'appointment.booked',
            recipients: [
                {
                    role: 'patient',
                    userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                    email: 'patient@example.com',
                    link: '/patient/appointments/a1',
                },
                {
                    role: 'staff',
                    userId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
                    email: 'staff@example.com',
                    link: '/doctor/appointments/a1',
                },
            ],
            data: {
                appointmentId: 'a1',
                serviceName: 'Initial Consultation',
                departmentName: 'Cardiology',
                scheduledAt: '2030-01-02T09:00:00.000Z',
            },
        });

        expect(result.notifications).toHaveLength(2);
        expect(result.emailOnlyCount).toBe(0);
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                type: 'appointment.booked',
                link: '/patient/appointments/a1',
                channels: ['in_app', 'email'],
            }),
        );
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
                type: 'appointment.booked',
                link: '/doctor/appointments/a1',
                channels: ['in_app', 'email'],
            }),
        );
        expect(emailService.sendNotification).toHaveBeenCalledTimes(2);
        expect(emitNew).toHaveBeenCalledTimes(2);
    });

    it('sends typed email-only account notifications without creating in-app records', async () => {
        const { repository, emailService, service } = createFixture();
        const emitNew = jest.spyOn(notificationGateway, 'emitNew').mockImplementation();

        const result = await service.sendTyped({
            type: 'account.password_reset',
            recipients: [
                {
                    role: 'user',
                    email: 'user@example.com',
                },
            ],
            data: {
                resetUrl: 'https://medsphere.example/reset/token',
            },
        });

        expect(result.notifications).toEqual([]);
        expect(result.emailOnlyCount).toBe(1);
        expect(repository.create).not.toHaveBeenCalled();
        expect(emitNew).not.toHaveBeenCalled();
        expect(emailService.sendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'account.password_reset',
                title: 'Reset your MedSphere password',
                link: 'https://medsphere.example/reset/token',
            }),
            'user@example.com',
        );
    });

    it('rejects typed notifications missing a required recipient role', async () => {
        const { service } = createFixture();

        await expect(
            service.sendTyped({
                type: 'appointment.cancelled',
                recipients: [
                    {
                        role: 'patient',
                        userId: notification.userId,
                        email: 'patient@example.com',
                    },
                ],
                data: {},
            }),
        ).rejects.toThrow('Missing staff recipient');
    });

    it('rejects typed email-channel recipients without an email address', async () => {
        const { service } = createFixture();

        await expect(
            service.sendTyped({
                type: 'lab.results.reviewed',
                recipients: [
                    {
                        role: 'patient',
                        userId: notification.userId,
                    },
                ],
                data: {},
            }),
        ).rejects.toThrow('Email notification recipients require email');
    });

    it('rejects notifications that omit the in-app channel', async () => {
        const { service } = createFixture();

        await expect(
            service.create({
                userId: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                channels: ['email'],
            }),
        ).rejects.toThrow('Notification must include the in_app channel');
    });

    it('marks all notifications as read and reports the affected count', async () => {
        const { service } = createFixture();
        const emitAllRead = jest.spyOn(notificationGateway, 'emitAllRead').mockImplementation();

        await expect(service.markAllRead(notification.userId)).resolves.toEqual({ count: 3 });
        expect(emitAllRead).toHaveBeenCalledWith(notification.userId, 3);
    });

    it('emits when one notification is marked as read', async () => {
        const { service } = createFixture();
        const emitRead = jest.spyOn(notificationGateway, 'emitRead').mockImplementation();
        const result = await service.markRead(notification.id, notification.userId);

        expect(result.isRead).toBe(true);
        expect(emitRead).toHaveBeenCalledWith(notification.userId, result);
    });
});
