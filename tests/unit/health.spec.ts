import request from 'supertest';

describe('health route', () => {
    beforeAll(() => {
        process.env.DATABASE_URL ||= 'postgresql://medsphere:medsphere@localhost:5432/medsphere_notifications?schema=public';
        process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
        process.env.INTERNAL_API_KEY ||= 'test-internal-api-key';
        process.env.CORS_ORIGIN ||= 'http://localhost:5173';
    });

    it('reports the notification service as healthy', async () => {
        const { createApp } = await import('../../src/app');

        await request(createApp()).get('/health').expect(200).expect({
            status: 'ok',
            service: 'notification-service',
        });
    });
});
