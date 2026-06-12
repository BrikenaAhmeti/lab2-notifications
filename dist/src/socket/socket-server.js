"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = createSocketServer;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("redis");
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const cors_origin_1 = require("../shared/cors-origin");
const chat_gateway_1 = require("./chat.gateway");
const notification_gateway_1 = require("./notification.gateway");
async function createSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: cors_origin_1.corsOrigin,
            credentials: true,
        },
    });
    if (env_1.env.redisUrl) {
        const pubClient = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    }
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token || typeof token !== 'string') {
            return next(new Error('Missing socket auth token'));
        }
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtAccessSecret);
            const userId = payload.sub || payload.userId || payload.id;
            if (!userId) {
                return next(new Error('Invalid socket auth token'));
            }
            socket.userId = userId;
            return next();
        }
        catch {
            return next(new Error('Invalid socket auth token'));
        }
    });
    io.on('connection', (socket) => {
        if (socket.userId) {
            socket.join(`user:${socket.userId}`);
        }
    });
    notification_gateway_1.notificationGateway.bind(io);
    chat_gateway_1.chatGateway.bind(io);
    return io;
}
