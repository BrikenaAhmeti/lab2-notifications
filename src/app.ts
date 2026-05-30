import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './docs/swagger';
import { chatRoutes } from './modules/chat/presentation/chat.routes';
import { dashboardRoutes, internalDashboardRoutes } from './modules/dashboard/presentation/dashboard.routes';
import { internalNotificationRoutes, notificationRoutes } from './modules/notifications/presentation/notification.routes';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: env.corsOrigin, credentials: true }));
    app.use(morgan('dev'));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', service: 'notification-service' });
    });

    if (env.swaggerEnabled) {
        const swaggerUiHandler = swaggerUi.setup(swaggerSpec);

        app.get(['/api/docs.json', '/api-docs.json'], (_req, res) => {
            res.json(swaggerSpec);
        });
        app.use(['/api/docs', '/api-docs'], swaggerUi.serve);
        app.get(['/api/docs', '/api-docs'], swaggerUiHandler);
    }

    app.use('/uploads/chat', express.static(env.chat.uploadDir));
    app.use('/internal/dashboard', internalDashboardRoutes);
    app.use('/internal/notifications', internalNotificationRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/chat', chatRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
