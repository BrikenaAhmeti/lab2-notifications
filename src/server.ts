import { createServer } from 'http';

import { createApp } from './app';
import { env } from './config/env';
import { initializeMongoCollections } from './infrastructure/mongo/mongo';
import { startAppointmentReminderJob } from './jobs/reminderJob';
import { notificationService } from './modules/notifications/presentation/notification.routes';
import { createSocketServer } from './socket/socket-server';

async function bootstrap() {
    const app = createApp();
    const httpServer = createServer(app);

    await initializeMongoCollections();
    await createSocketServer(httpServer);
    startAppointmentReminderJob(notificationService);

    httpServer.listen(env.port, () => {
        console.log(`Notification service running on port ${env.port}`);
    });
}

void bootstrap();
