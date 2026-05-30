import request from 'supertest';

describe('swagger documentation', () => {
    beforeAll(() => {
        process.env.DATABASE_URL ||= 'postgresql://medsphere:medsphere@localhost:5432/medsphere_notifications?schema=public';
        process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
        process.env.INTERNAL_API_KEY ||= 'test-internal-api-key';
        process.env.CORS_ORIGIN ||= 'http://localhost:5173';
        process.env.SWAGGER_ENABLED = 'true';
    });

    it('documents every REST route exposed by the notification service', async () => {
        const { swaggerSpec } = await import('../../src/docs/swagger');
        const spec = swaggerSpec as Record<string, any>;

        expect(Object.keys(spec.paths)).toEqual(
            expect.arrayContaining([
                '/health',
                '/internal/notifications/send',
                '/internal/dashboard/activity',
                '/api/dashboard/activity',
                '/api/notifications',
                '/api/notifications/read-all',
                '/api/notifications/{id}/read',
                '/api/notifications/{id}',
                '/api/chat/rooms',
                '/api/chat/rooms/{roomId}/messages',
                '/api/chat/rooms/{roomId}/read',
                '/api/chat/rooms/{roomId}/upload',
            ]),
        );
        expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
        expect(spec.components.securitySchemes.internalApiKey.name).toBe('x-internal-api-key');
        expect(spec.components.responses).toEqual(
            expect.objectContaining({
                BadRequest: expect.any(Object),
                Unauthorized: expect.any(Object),
                Forbidden: expect.any(Object),
                NotFound: expect.any(Object),
                Conflict: expect.any(Object),
                ValidationError: expect.any(Object),
            }),
        );
        expect(
            spec.paths['/internal/notifications/send'].post.requestBody.content['application/json']
                .examples,
        ).toEqual(
            expect.objectContaining({
                typedAppointmentBooked: expect.any(Object),
                legacy: expect.any(Object),
            }),
        );
    });

    it('serves the OpenAPI JSON on the current and legacy docs paths', async () => {
        const { createApp } = await import('../../src/app');
        const app = createApp();

        const currentDocs = await request(app)
            .get('/api/docs.json')
            .expect(200)
            .expect('Content-Type', /json/);
        const legacyDocs = await request(app)
            .get('/api-docs.json')
            .expect(200)
            .expect('Content-Type', /json/);

        expect(currentDocs.body.openapi).toBe('3.0.3');
        expect(currentDocs.body.paths).toHaveProperty('/api/chat/rooms');
        expect(legacyDocs.body.info.title).toBe('MedSphere Notification Service API');
    });

    it('returns the documented JSON 400 shape for malformed request bodies', async () => {
        const { createApp } = await import('../../src/app');
        const app = createApp();

        await request(app)
            .post('/internal/notifications/send')
            .set('x-internal-api-key', 'test-internal-api-key')
            .set('Content-Type', 'application/json')
            .send('{"type":')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect(({ body }) => {
                expect(body.message).toEqual(expect.any(String));
            });
    });
});
