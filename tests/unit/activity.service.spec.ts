import { ActivityService } from '../../src/modules/dashboard/application/activity.service';
import { ActivityRepository } from '../../src/modules/dashboard/domain/activity.repository';
import { notificationGateway } from '../../src/socket/notification.gateway';

const activity = {
    id: 'activity-1',
    actionType: 'lab.results.completed',
    description: 'Lab results were entered for Ada Lovelace.',
    actorName: 'Lab Tech',
    entityLabel: 'Lab order lab-1',
    entityLink: '/lab/orders/lab-1',
    createdAt: new Date('2026-05-27T11:00:00.000Z'),
};

function createFixture() {
    const repository: jest.Mocked<ActivityRepository> = {
        create: jest.fn().mockResolvedValue(activity),
        list: jest.fn(),
    };

    return {
        repository,
        service: new ActivityService(repository),
    };
}

describe('ActivityService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('emits activity:new when new activity is written', async () => {
        const { repository, service } = createFixture();
        const emitActivityNew = jest.spyOn(notificationGateway, 'emitActivityNew').mockImplementation();

        await expect(service.record({
            actionType: activity.actionType,
            description: activity.description,
            actorName: activity.actorName,
            entityLabel: activity.entityLabel,
            entityLink: activity.entityLink,
        })).resolves.toBe(activity);

        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
            actionType: activity.actionType,
        }));
        expect(emitActivityNew).toHaveBeenCalledWith(activity);
    });

    it('records supported domain events', async () => {
        const { repository, service } = createFixture();
        jest.spyOn(notificationGateway, 'emitActivityNew').mockImplementation();

        await service.recordDomainEvent({
            type: 'lab.results.completed',
            data: {
                actorName: 'Lab Tech',
                patientName: 'Ada Lovelace',
                labOrderId: 'lab-1',
            },
        });

        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'lab.results.completed',
            description: 'Lab Tech entered lab results for Ada Lovelace.',
            entityLabel: 'Lab order lab-1',
            entityLink: '/lab/orders/lab-1',
        }));
    });

    it('skips notification events that are not dashboard activity', async () => {
        const { repository, service } = createFixture();

        await expect(service.recordNotificationEvent({
            type: 'account.verification',
            data: {},
        })).resolves.toBeNull();
        expect(repository.create).not.toHaveBeenCalled();
    });
});
