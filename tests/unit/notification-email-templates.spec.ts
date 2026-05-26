import { Notification } from '../../src/modules/notifications/domain/notification.entity';
import {
    notificationTemplateDefinitions,
    renderNotificationEmail,
} from '../../src/services/email/templates/notification-email-templates';

const expectedTypes = [
    'appointment.booked',
    'appointment.confirmed',
    'appointment.reminder.24h',
    'appointment.reminder.1h',
    'appointment.cancelled',
    'appointment.rescheduled',
    'appointment.no_show',
    'lab.results.completed',
    'lab.results.reviewed',
    'prescription.created',
    'prescription.ready_for_pickup',
    'prescription.medication_out_of_stock',
    'inventory.low_stock',
    'inventory.expiry_warning',
    'feedback.created',
    'contact.submitted',
    'account.verification',
    'account.password_reset',
    'chat.message.created',
    'appointment.ai_booked',
];

describe('notification email templates', () => {
    it('defines all PRD notification event templates', () => {
        expect(Object.keys(notificationTemplateDefinitions).sort()).toEqual(
            expectedTypes.sort(),
        );
    });

    it('renders a subject and body for every known template', () => {
        for (const type of expectedTypes) {
            const notification: Notification = {
                id: 'ef151067-b411-4604-b24e-1906393ce833',
                userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                type,
                title: 'Notification title',
                message: 'Notification message',
                link: '/patient/appointments/123',
                channels: ['in_app', 'email'],
                isRead: false,
                readAt: null,
                createdAt: new Date('2026-05-15T10:00:00.000Z'),
            };

            const email = renderNotificationEmail(notification);

            expect(email.subject).toBeTruthy();
            expect(email.text).toContain(notification.message);
            expect(email.text).toContain(notification.link);
        }
    });
});
