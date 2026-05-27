import { PrismaClient } from '../../src/generated/prisma';
import { PrismaNotificationRepository } from '../../src/modules/notifications/infrastructure/notification.prisma.repository';

const userId = '55f75ac7-b85d-48a4-adba-df4ba1dcba61';

const notificationRecord = {
    id: 'ef151067-b411-4604-b24e-1906393ce833',
    userId,
    type: 'appointment.booked',
    title: 'Appointment booked',
    message: 'Your appointment was booked.',
    link: '/patient/appointments/1',
    channels: ['in_app'],
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
};

function createRepository() {
    const findMany = jest.fn().mockResolvedValue([notificationRecord]);
    const count = jest.fn();
    const prisma = {
        notification: {
            findMany,
            count,
        },
    } as unknown as PrismaClient;

    return {
        findMany,
        count,
        repository: new PrismaNotificationRepository(prisma),
    };
}

describe('PrismaNotificationRepository', () => {
    it('returns unreadCount alongside unfiltered notification pages', async () => {
        const { count, findMany, repository } = createRepository();
        count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

        const result = await repository.list({
            userId,
            page: 1,
            limit: 20,
        });

        expect(findMany).toHaveBeenCalledWith({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: 20,
        });
        expect(count).toHaveBeenNthCalledWith(1, { where: { userId } });
        expect(count).toHaveBeenNthCalledWith(2, { where: { userId, isRead: false } });
        expect(result.meta).toEqual({
            page: 1,
            limit: 20,
            totalItems: 5,
            totalPages: 1,
            unreadCount: 2,
        });
    });

    it('uses the filtered total as unreadCount for isRead=false count queries', async () => {
        const { count, repository } = createRepository();
        count.mockResolvedValueOnce(3);

        const result = await repository.list({
            userId,
            isRead: false,
            page: 1,
            limit: 1,
        });

        expect(count).toHaveBeenCalledTimes(1);
        expect(count).toHaveBeenCalledWith({ where: { userId, isRead: false } });
        expect(result.meta).toEqual({
            page: 1,
            limit: 1,
            totalItems: 3,
            totalPages: 3,
            unreadCount: 3,
        });
    });
});
