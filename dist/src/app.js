"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const swagger_1 = require("./docs/swagger");
const chat_routes_1 = require("./modules/chat/presentation/chat.routes");
const dashboard_routes_1 = require("./modules/dashboard/presentation/dashboard.routes");
const notification_routes_1 = require("./modules/notifications/presentation/notification.routes");
const cors_origin_1 = require("./shared/cors-origin");
const error_handler_1 = require("./shared/middleware/error-handler");
const not_found_1 = require("./shared/middleware/not-found");
const rate_limit_1 = require("./shared/middleware/rate-limit");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({ origin: cors_origin_1.corsOrigin, credentials: true }));
    app.use((0, rate_limit_1.createRateLimiter)({
        windowMs: 15 * 60_000,
        maxRequests: 500,
        skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
    }));
    app.use((0, morgan_1.default)('dev'));
    app.use(express_1.default.json({ limit: '12mb' }));
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'notification-service' });
    });
    if (env_1.env.swaggerEnabled) {
        const swaggerUiHandler = swagger_ui_express_1.default.setup(swagger_1.swaggerSpec);
        app.get(['/api/docs.json', '/api-docs.json'], (_req, res) => {
            res.json(swagger_1.swaggerSpec);
        });
        app.use(['/api/docs', '/api-docs'], swagger_ui_express_1.default.serve);
        app.get(['/api/docs', '/api-docs'], swaggerUiHandler);
    }
    app.use('/uploads/chat', express_1.default.static(env_1.env.chat.uploadDir));
    app.use('/internal/dashboard', dashboard_routes_1.internalDashboardRoutes);
    app.use('/internal/notifications', notification_routes_1.internalNotificationRoutes);
    app.use('/api/dashboard', dashboard_routes_1.dashboardRoutes);
    app.use('/api/notifications', notification_routes_1.notificationRoutes);
    app.use('/api/chat', chat_routes_1.chatRoutes);
    app.use(not_found_1.notFoundHandler);
    app.use(error_handler_1.errorHandler);
    return app;
}
