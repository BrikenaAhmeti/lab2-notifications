import { Server } from 'socket.io';

import { ActivityStreamItem } from '../modules/dashboard/domain/activity.entity';
import { Notification } from '../modules/notifications/domain/notification.entity';

class NotificationGateway {
    private io?: Server;

    bind(io: Server) {
        this.io = io;
    }

    emitNew(notification: Notification) {
        this.emitToUser(notification.userId, 'notification:new', notification);
    }

    emitRead(userId: string, notification: Notification) {
        this.emitToUser(userId, 'notification:read', notification);
    }

    emitAllRead(userId: string, count: number) {
        this.emitToUser(userId, 'notification:all-read', { count });
    }

    emitActivityNew(activity: ActivityStreamItem) {
        this.io?.emit('activity:new', activity);
    }

    private emitToUser(userId: string, event: string, payload: unknown) {
        this.io?.to(`user:${userId}`).emit(event, payload);
    }
}

export const notificationGateway = new NotificationGateway();
