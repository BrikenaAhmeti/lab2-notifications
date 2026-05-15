import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';

import { env } from '../config/env';
import { notificationGateway } from './notification.gateway';

type SocketJwtPayload = {
    sub?: string;
    userId?: string;
    id?: string;
};

type AuthenticatedSocket = Socket & {
    userId?: string;
};

export async function createSocketServer(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigin,
            credentials: true,
        },
    });

    if (env.redisUrl) {
        const pubClient = createClient({ url: env.redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
    }

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token || typeof token !== 'string') {
            return next(new Error('Missing socket auth token'));
        }

        try {
            const payload = jwt.verify(token, env.jwtAccessSecret) as SocketJwtPayload;
            const userId = payload.sub || payload.userId || payload.id;

            if (!userId) {
                return next(new Error('Invalid socket auth token'));
            }

            socket.userId = userId;
            return next();
        } catch {
            return next(new Error('Invalid socket auth token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        if (socket.userId) {
            socket.join(`user:${socket.userId}`);
        }
    });

    notificationGateway.bind(io);

    return io;
}
