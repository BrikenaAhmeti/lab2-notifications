import { AppointmentReminderJob } from '../../src/jobs/reminderJob';
import { NotificationService } from '../../src/modules/notifications/application/notification.service';

describe('AppointmentReminderJob', () => {
    it('sends day-of and 2h reminders to patients and doctors with the correct channels', async () => {
        const notificationService = {
            create: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<NotificationService>;
        const fetcher = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    {
                        id: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
                        scheduledAt: '2030-01-02T09:00:00.000Z',
                        patient: {
                            userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                            email: 'patient@medsphere.local',
                            name: 'Ada Lovelace',
                        },
                        staff: {
                            userId: 'f1807740-1c7b-4a6d-a757-2913e58ea7ed',
                            displayName: 'Dr. Rivera',
                        },
                        service: { name: 'Initial Consultation' },
                        department: { name: 'Cardiology' },
                    },
                ],
            }),
        });
        const job = new AppointmentReminderJob(
            notificationService,
            'http://core-service:3007',
            'test-internal-api-key',
            fetcher as unknown as typeof fetch,
        );

        await job.runOnce(new Date('2030-01-01T08:00:00.000Z'));

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(notificationService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'appointment.reminder.day_of',
                channels: ['in_app', 'email'],
                recipientEmail: 'patient@medsphere.local',
                dedupeByTypeAndLink: true,
            }),
        );
        expect(notificationService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'appointment.reminder.2h',
                channels: ['in_app', 'email'],
                recipientEmail: 'patient@medsphere.local',
                dedupeByTypeAndLink: true,
            }),
        );
        expect(notificationService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'f1807740-1c7b-4a6d-a757-2913e58ea7ed',
                type: 'appointment.doctor_reminder.day_of',
                channels: ['in_app'],
                dedupeByTypeAndLink: true,
            }),
        );
        expect(notificationService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'f1807740-1c7b-4a6d-a757-2913e58ea7ed',
                type: 'appointment.doctor_reminder.2h',
                channels: ['in_app'],
                dedupeByTypeAndLink: true,
            }),
        );
    });
});
