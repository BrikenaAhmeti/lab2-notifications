import { sendNotificationSchema } from '../../src/modules/notifications/presentation/notification.schemas';

const payload = {
    userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
    type: 'appointment.booked',
    title: 'Appointment booked',
    message: 'Your appointment was booked.',
};

describe('sendNotificationSchema', () => {
    it('accepts app route links for the frontend notification bell', () => {
        const result = sendNotificationSchema.parse({
            ...payload,
            link: '/patient/appointments/1',
        });

        expect(result.link).toBe('/patient/appointments/1');
    });

    it('accepts absolute links', () => {
        const result = sendNotificationSchema.parse({
            ...payload,
            link: 'https://medsphere.example/patient/appointments/1',
        });

        expect(result.link).toBe('https://medsphere.example/patient/appointments/1');
    });

    it('rejects unsafe protocol-relative links', () => {
        expect(() =>
            sendNotificationSchema.parse({
                ...payload,
                link: '//example.com/path',
            }),
        ).toThrow();
    });

    it('rejects unsupported link protocols', () => {
        expect(() =>
            sendNotificationSchema.parse({
                ...payload,
                link: 'javascript:alert(1)',
            }),
        ).toThrow();
    });
});
