import { env } from '../config/env';

const configuredOrigins = env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

function isLocalDevelopmentOrigin(origin: string) {
    if (env.nodeEnv === 'production') {
        return false;
    }

    try {
        const url = new URL(origin);
        return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch {
        return false;
    }
}

export function isCorsOriginAllowed(origin?: string) {
    if (!origin) return true;
    if (configuredOrigins.includes(origin)) return true;
    if (configuredOrigins.includes('*') && env.nodeEnv !== 'production') return true;
    return isLocalDevelopmentOrigin(origin);
}

export function corsOrigin(
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
) {
    if (isCorsOriginAllowed(origin)) {
        return callback(null, true);
    }

    return callback(new Error('CORS policy: origin not allowed'), false);
}
