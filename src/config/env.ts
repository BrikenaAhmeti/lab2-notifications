import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(3005),
    NODE_ENV: z.string().default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    MONGODB_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
    INTERNAL_API_KEY: z.string().min(1).default('dev-internal-api-key'),
    CORS_ORIGIN: z.string().default('*'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().default('notifications@medsphere.local'),
    CORE_SERVICE_URL: z.string().url().optional(),
    APPOINTMENT_REMINDER_JOB_ENABLED: z.coerce.boolean().default(true),
    SWAGGER_ENABLED: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');

    throw new Error(`Invalid environment configuration: ${issues}`);
}

const values = parsed.data;

export const env = {
    port: values.PORT,
    nodeEnv: values.NODE_ENV,
    databaseUrl: values.DATABASE_URL,
    mongoUrl: values.MONGODB_URL,
    redisUrl: values.REDIS_URL,
    jwtAccessSecret: values.JWT_ACCESS_SECRET,
    internalApiKey: values.INTERNAL_API_KEY,
    corsOrigin: values.CORS_ORIGIN,
    smtp: {
        host: values.SMTP_HOST,
        port: values.SMTP_PORT,
        user: values.SMTP_USER,
        pass: values.SMTP_PASS,
        from: values.SMTP_FROM,
    },
    coreServiceUrl: values.CORE_SERVICE_URL,
    appointmentReminderJobEnabled:
        values.APPOINTMENT_REMINDER_JOB_ENABLED && values.NODE_ENV !== 'test',
    swaggerEnabled: values.SWAGGER_ENABLED,
};
