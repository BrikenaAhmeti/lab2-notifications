"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = require("./app");
const env_1 = require("./config/env");
const mongo_1 = require("./infrastructure/mongo/mongo");
const reminderJob_1 = require("./jobs/reminderJob");
const notification_routes_1 = require("./modules/notifications/presentation/notification.routes");
const socket_server_1 = require("./socket/socket-server");
async function bootstrap() {
    const app = (0, app_1.createApp)();
    const httpServer = (0, http_1.createServer)(app);
    await (0, mongo_1.initializeMongoCollections)();
    await (0, socket_server_1.createSocketServer)(httpServer);
    (0, reminderJob_1.startAppointmentReminderJob)(notification_routes_1.notificationService);
    httpServer.listen(env_1.env.port, () => {
        console.log(`Notification service running on port ${env_1.env.port}`);
    });
}
void bootstrap();
