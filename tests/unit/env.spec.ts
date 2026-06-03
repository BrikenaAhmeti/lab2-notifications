describe('env config', () => {
    const originalEnv = process.env;

    async function loadEnv(overrides: NodeJS.ProcessEnv) {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            DATABASE_URL: 'postgresql://medsphere:medsphere@localhost:5432/medsphere_notifications?schema=public',
            JWT_ACCESS_SECRET: 'test-access-secret',
            INTERNAL_API_KEY: 'test-internal-api-key',
            ...overrides,
        };

        return import('../../src/config/env');
    }

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    it('treats empty optional URLs as unset', async () => {
        const { env } = await loadEnv({
            AUTH_SERVICE_URL: '',
            CORE_SERVICE_URL: '',
            CHAT_PUBLIC_BASE_URL: '',
        });

        expect(env.authServiceUrl).toBeUndefined();
        expect(env.coreServiceUrl).toBeUndefined();
        expect(env.chat.publicBaseUrl).toBeUndefined();
    });
});
