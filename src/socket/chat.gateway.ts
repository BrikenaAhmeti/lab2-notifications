import { Server } from 'socket.io';

import { ChatMessage } from '../modules/chat/domain/chat.entity';

type ChatReadPayload = {
    roomId: string;
    userId: string;
    readAt: Date;
    readCount: number;
};

class ChatGateway {
    private io?: Server;

    bind(io: Server) {
        this.io = io;
    }

    emitMessage(participantIds: string[], message: ChatMessage) {
        this.emitToUsers(participantIds, 'chat:message', message);
    }

    emitRead(participantIds: string[], payload: ChatReadPayload) {
        this.emitToUsers(participantIds, 'chat:read', payload);
    }

    private emitToUsers(userIds: string[], event: string, payload: unknown) {
        for (const userId of new Set(userIds)) {
            this.io?.to(`user:${userId}`).emit(event, payload);
        }
    }
}

export const chatGateway = new ChatGateway();
