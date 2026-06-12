"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
function createRateLimiter(options) {
    const store = new Map();
    const message = options.message ?? 'Too many requests. Please try again later.';
    let lastCleanupAt = Date.now();
    return (req, res, next) => {
        if (options.skip?.(req)) {
            return next();
        }
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        cleanupExpiredEntries(store, now, lastCleanupAt, options.windowMs);
        if (now - lastCleanupAt >= options.windowMs) {
            lastCleanupAt = now;
        }
        const current = store.get(key);
        if (!current || now >= current.resetAt) {
            const resetAt = now + options.windowMs;
            store.set(key, { count: 1, resetAt });
            setRateLimitHeaders(res, options.maxRequests, options.maxRequests - 1, resetAt);
            return next();
        }
        if (current.count >= options.maxRequests) {
            setRateLimitHeaders(res, options.maxRequests, 0, current.resetAt);
            res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
            return res.status(429).json({ message });
        }
        current.count += 1;
        store.set(key, current);
        setRateLimitHeaders(res, options.maxRequests, Math.max(options.maxRequests - current.count, 0), current.resetAt);
        return next();
    };
}
function cleanupExpiredEntries(store, now, lastCleanupAt, intervalMs) {
    if (now - lastCleanupAt < intervalMs) {
        return;
    }
    for (const [key, entry] of store.entries()) {
        if (now >= entry.resetAt) {
            store.delete(key);
        }
    }
}
function setRateLimitHeaders(res, limit, remaining, resetAt) {
    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(resetAt / 1000));
}
