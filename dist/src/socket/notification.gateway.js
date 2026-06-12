"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationGateway = void 0;
class NotificationGateway {
    io;
    bind(io) {
        this.io = io;
    }
    emitNew(notification) {
        this.emitToUser(notification.userId, 'notification:new', notification);
    }
    emitRead(userId, notification) {
        this.emitToUser(userId, 'notification:read', notification);
    }
    emitAllRead(userId, count) {
        this.emitToUser(userId, 'notification:all-read', { count });
    }
    emitActivityNew(activity) {
        this.io?.emit('activity:new', activity);
    }
    emitToUser(userId, event, payload) {
        this.io?.to(`user:${userId}`).emit(event, payload);
    }
}
exports.notificationGateway = new NotificationGateway();
