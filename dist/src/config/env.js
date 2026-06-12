"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const optionalUrl = zod_1.z.preprocess((value) => (value === '' ? undefined : value), zod_1.z.string().url().optional());
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3008),
    NODE_ENV: zod_1.z.string().default('development'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    MONGODB_URL: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().optional(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(1, 'JWT_ACCESS_SECRET is required'),
    INTERNAL_API_KEY: zod_1.z.string().min(1).default('dev-internal-api-key'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().email().default('notifications@medsphere.local'),
    AUTH_SERVICE_URL: optionalUrl,
    CORE_SERVICE_URL: optionalUrl,
    CHAT_UPLOAD_DIR: zod_1.z.string().default('uploads/chat'),
    CHAT_PUBLIC_BASE_URL: optionalUrl,
    APPOINTMENT_REMINDER_JOB_ENABLED: zod_1.z.coerce.boolean().default(true),
    SWAGGER_ENABLED: zod_1.z.coerce.boolean().default(true),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
    throw new Error(`Invalid environment configuration: ${issues}`);
}
const values = parsed.data;
exports.env = {
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
    authServiceUrl: values.AUTH_SERVICE_URL,
    coreServiceUrl: values.CORE_SERVICE_URL,
    chat: {
        uploadDir: values.CHAT_UPLOAD_DIR,
        publicBaseUrl: values.CHAT_PUBLIC_BASE_URL,
    },
    appointmentReminderJobEnabled: values.APPOINTMENT_REMINDER_JOB_ENABLED && values.NODE_ENV !== 'test',
    swaggerEnabled: values.SWAGGER_ENABLED,
};
