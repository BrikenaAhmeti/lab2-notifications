"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatGateway = void 0;
class ChatGateway {
    io;
    bind(io) {
        this.io = io;
    }
    emitMessage(participantIds, message) {
        this.emitToUsers(participantIds, 'chat:message', message);
    }
    emitRead(participantIds, payload) {
        this.emitToUsers(participantIds, 'chat:read', payload);
    }
    emitToUsers(userIds, event, payload) {
        for (const userId of new Set(userIds)) {
            this.io?.to(`user:${userId}`).emit(event, payload);
        }
    }
}
exports.chatGateway = new ChatGateway();
