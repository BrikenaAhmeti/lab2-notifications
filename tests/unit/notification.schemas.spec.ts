import {
    listNotificationsQuerySchema,
    sendNotificationSchema,
} from '../../src/modules/notifications/presentation/notification.schemas';

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

    it('accepts typed MS-31 payloads with recipients and event data', () => {
        const result = sendNotificationSchema.parse({
            type: 'appointment.booked',
            recipients: [
                {
                    role: 'patient',
                    userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                    email: 'patient@example.com',
                },
                {
                    role: 'staff',
                    userId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
                    email: 'staff@example.com',
                    link: '/doctor/appointments/1',
                },
            ],
            data: {
                appointmentId: '1',
                serviceName: 'Initial Consultation',
            },
        });

        expect(result).toEqual(
            expect.objectContaining({
                type: 'appointment.booked',
                recipients: expect.arrayContaining([
                    expect.objectContaining({ role: 'patient' }),
                    expect.objectContaining({ role: 'staff' }),
                ]),
            }),
        );
    });

    it('rejects typed payloads for unknown event types', () => {
        expect(() =>
            sendNotificationSchema.parse({
                type: 'billing.created',
                recipients: [
                    {
                        role: 'patient',
                        userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                    },
                ],
            }),
        ).toThrow();
    });
});

describe('listNotificationsQuerySchema', () => {
    it('accepts the unread-count query used by the frontend notification bell', () => {
        const result = listNotificationsQuerySchema.parse({
            isRead: 'false',
            page: '1',
            limit: '1',
        });

        expect(result).toEqual({
            isRead: false,
            page: 1,
            limit: 1,
        });
    });
});
