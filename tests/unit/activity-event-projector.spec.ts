import { projectActivityFromDomainEvent } from '../../src/modules/dashboard/domain/activity-event-projector';

describe('activity event projector', () => {
    it('projects payment domain events into dashboard feed items', () => {
        const activity = projectActivityFromDomainEvent({
            type: 'payment.recorded',
            data: {
                actorName: 'Rita Receptionist',
                patientName: 'Ada Lovelace',
                amount: 75.5,
                currency: 'EUR',
                billingId: 'billing-1',
                invoiceNumber: 'INV-1001',
                occurredAt: '2026-05-27T09:30:00.000Z',
            },
        });

        expect(activity).toEqual(expect.objectContaining({
            actionType: 'payment.recorded',
            description: 'Rita Receptionist recorded a 75.50 EUR payment for Ada Lovelace.',
            actorName: 'Rita Receptionist',
            entityLabel: 'INV-1001',
            entityLink: '/admin/billing/billing-1',
            createdAt: new Date('2026-05-27T09:30:00.000Z'),
        }));
    });

    it('lets services override frontend-facing activity labels', () => {
        const activity = projectActivityFromDomainEvent({
            type: 'appointment.status_changed',
            data: {
                actorName: 'Nora Nurse',
                patientName: 'Grace Hopper',
                status: 'checked_in',
                appointmentId: 'appointment-1',
                activityDescription: 'Grace Hopper checked in for Cardiology.',
                activityEntityLabel: 'Cardiology visit',
                activityEntityLink: '/admin/appointments/appointment-1',
            },
        });

        expect(activity).toEqual(expect.objectContaining({
            actionType: 'appointment.status_changed',
            description: 'Grace Hopper checked in for Cardiology.',
            actorName: 'Nora Nurse',
            entityLabel: 'Cardiology visit',
            entityLink: '/admin/appointments/appointment-1',
        }));
    });

    it('ignores notification-only events that should not pollute the facility feed', () => {
        expect(projectActivityFromDomainEvent({
            type: 'account.password_reset',
            data: {},
        })).toBeNull();
    });
});
