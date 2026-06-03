describe('cors origin helper', () => {
    const originalEnv = process.env;

    async function loadHelper(env: NodeJS.ProcessEnv) {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            DATABASE_URL: 'postgresql://medsphere:medsphere@localhost:5432/medsphere_notifications?schema=public',
            JWT_ACCESS_SECRET: 'test-access-secret',
            INTERNAL_API_KEY: 'test-internal-api-key',
            ...env,
        };

        return import('../../src/shared/cors-origin');
    }

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    it('allows explicitly configured localhost origins in production', async () => {
        const { isCorsOriginAllowed } = await loadHelper({
            NODE_ENV: 'production',
            CORS_ORIGIN: 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002',
        });

        expect(isCorsOriginAllowed('http://localhost:3000')).toBe(true);
        expect(isCorsOriginAllowed('http://127.0.0.1:3000')).toBe(true);
        expect(isCorsOriginAllowed('http://localhost:3002')).toBe(true);
        expect(isCorsOriginAllowed('http://127.0.0.1:3002')).toBe(true);
    });

    it('keeps production localhost origins restricted to the configured allowlist', async () => {
        const { isCorsOriginAllowed } = await loadHelper({
            NODE_ENV: 'production',
            CORS_ORIGIN: 'http://localhost:3001',
        });

        expect(isCorsOriginAllowed('http://localhost:3000')).toBe(false);
    });

    it('allows any loopback origin outside production', async () => {
        const { isCorsOriginAllowed } = await loadHelper({
            NODE_ENV: 'development',
            CORS_ORIGIN: 'http://localhost:3001',
        });

        expect(isCorsOriginAllowed('http://localhost:3000')).toBe(true);
    });
});
