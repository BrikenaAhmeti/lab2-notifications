import { NotificationService } from '../../src/modules/notifications/application/notification.service';
import { Notification } from '../../src/modules/notifications/domain/notification.entity';
import { NotificationEmailService } from '../../src/modules/notifications/domain/notification-email.service';
import { NotificationRepository } from '../../src/modules/notifications/domain/notification.repository';

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
        create: jest.fn().mockResolvedValue(notification),
        list: jest.fn(),
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
    it('creates an in-app notification by default', async () => {
        const { repository, emailService, service } = createFixture();

        const result = await service.create({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
        });

        expect(result).toBe(notification);
        expect(repository.create).toHaveBeenCalledWith({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: null,
            channels: ['in_app'],
        });
        expect(emailService.sendNotification).not.toHaveBeenCalled();
    });

    it('sends email when the email channel is requested', async () => {
        const { emailService, service } = createFixture();

        await service.create({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            channels: ['in_app', 'email'],
            recipientEmail: 'patient@example.com',
        });

        expect(emailService.sendNotification).toHaveBeenCalledWith(notification, 'patient@example.com');
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

        await expect(service.markAllRead(notification.userId)).resolves.toEqual({ count: 3 });
    });
});
