import {
    notificationEventDefinitions,
    notificationEventTypes,
} from '../../src/modules/notifications/domain/notification-events';

const expectedDefinitions = {
    'appointment.booked': {
        recipients: ['patient', 'staff'],
        channels: ['in_app', 'email'],
    },
    'appointment.confirmed': {
        recipients: ['patient'],
        channels: ['in_app', 'email'],
    },
    'appointment.reminder.24h': {
        recipients: ['patient'],
        channels: ['in_app', 'email'],
    },
    'appointment.reminder.1h': {
        recipients: ['patient'],
        channels: ['in_app'],
    },
    'appointment.cancelled': {
        recipients: ['patient', 'staff'],
        channels: ['in_app', 'email'],
    },
    'appointment.rescheduled': {
        recipients: ['patient', 'staff'],
        channels: ['in_app', 'email'],
    },
    'appointment.no_show': {
        recipients: ['patient'],
        channels: ['in_app', 'email'],
    },
    'lab.results.completed': {
        recipients: ['doctor'],
        channels: ['in_app'],
    },
    'lab.results.reviewed': {
        recipients: ['patient'],
        channels: ['in_app', 'email'],
    },
    'prescription.created': {
        recipients: ['patient'],
        channels: ['in_app'],
    },
    'prescription.ready_for_pickup': {
        recipients: ['patient'],
        channels: ['in_app', 'email'],
    },
    'prescription.medication_out_of_stock': {
        recipients: ['patient', 'doctor'],
        channels: ['in_app'],
    },
    'inventory.low_stock': {
        recipients: ['admin', 'department_head'],
        channels: ['in_app'],
    },
    'inventory.expiry_warning': {
        recipients: ['admin', 'department_head'],
        channels: ['in_app'],
    },
    'feedback.created': {
        recipients: ['doctor'],
        channels: ['in_app'],
    },
    'contact.submitted': {
        recipients: ['admin'],
        channels: ['in_app'],
    },
    'account.verification': {
        recipients: ['patient'],
        channels: ['email'],
    },
    'account.password_reset': {
        recipients: ['user'],
        channels: ['email'],
    },
    'chat.message.created': {
        recipients: ['recipient'],
        channels: ['in_app'],
    },
    'appointment.ai_booked': {
        recipients: ['patient', 'staff'],
        channels: ['in_app', 'email'],
    },
} as const;

describe('notification event definitions', () => {
    it('defines PRD 18.1 recipients and channels for every MS-31 event type', () => {
        expect([...notificationEventTypes].sort()).toEqual(Object.keys(expectedDefinitions).sort());

        for (const [type, expected] of Object.entries(expectedDefinitions)) {
            const definition =
                notificationEventDefinitions[type as keyof typeof notificationEventDefinitions];

            expect(definition.recipientRoles).toEqual(expected.recipients);
            expect(definition.channels).toEqual(expected.channels);
        }
    });
});
