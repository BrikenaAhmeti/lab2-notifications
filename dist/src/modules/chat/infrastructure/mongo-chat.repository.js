"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoChatRepository = void 0;
const crypto_1 = require("crypto");
const app_error_1 = require("../../../shared/core/errors/app-error");
class MongoChatRepository {
    dbProvider;
    constructor(dbProvider) {
        this.dbProvider = dbProvider;
    }
    async findOrCreateDirectRoom(input) {
        const participants = normalizeParticipants(input.participantIds);
        const now = new Date();
        const room = await this.rooms.findOneAndUpdate({ directKey: participants.join(':') }, {
            $setOnInsert: {
                id: (0, crypto_1.randomUUID)(),
                directKey: participants.join(':'),
                participants,
                type: 'direct',
                lastMessageAt: null,
                lastMessage: null,
                createdAt: now,
                updatedAt: now,
            },
        }, {
            upsert: true,
            returnDocument: 'after',
        });
        if (!room) {
            throw new app_error_1.AppError('Unable to create chat room', 500);
        }
        return this.toRoom(room);
    }
    async findRoomForUser(roomId, userId) {
        const room = await this.rooms.findOne({ id: roomId, participants: userId });
        return room ? this.toRoom(room) : null;
    }
    async listRooms(input) {
        const filter = { participants: input.userId };
        const [rooms, totalItems] = await Promise.all([
            this.rooms
                .find(filter)
                .sort({ lastMessageAt: -1, createdAt: -1 })
                .skip((input.page - 1) * input.limit)
                .limit(input.limit)
                .toArray(),
            this.rooms.countDocuments(filter),
        ]);
        const unreadCounts = await this.getUnreadCounts(rooms.map((room) => room.id), input.userId);
        return {
            data: rooms.map((room) => ({
                ...this.toRoom(room),
                unreadCount: unreadCounts.get(room.id) ?? 0,
            })),
            meta: {
                page: input.page,
                limit: input.limit,
                totalItems,
                totalPages: Math.ceil(totalItems / input.limit),
            },
        };
    }
    async createMessage(input) {
        const createdAt = new Date();
        const message = {
            id: (0, crypto_1.randomUUID)(),
            roomId: input.roomId,
            senderId: input.senderId,
            content: input.content,
            type: input.type,
            fileUrl: input.fileUrl,
            isRead: false,
            readAt: null,
            createdAt,
        };
        await this.messages.insertOne(message);
        await this.rooms.updateOne({ id: input.roomId }, {
            $set: {
                lastMessageAt: createdAt,
                lastMessage: toPreview(message),
                updatedAt: createdAt,
            },
        });
        return message;
    }
    async listMessages(input) {
        const filter = { roomId: input.roomId };
        const [messages, totalItems] = await Promise.all([
            this.messages
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((input.page - 1) * input.limit)
                .limit(input.limit)
                .toArray(),
            this.messages.countDocuments(filter),
        ]);
        return {
            data: messages.reverse().map((message) => this.toMessage(message)),
            meta: {
                page: input.page,
                limit: input.limit,
                totalItems,
                totalPages: Math.ceil(totalItems / input.limit),
            },
        };
    }
    async markRoomRead(input) {
        const readAt = new Date();
        const result = await this.messages.updateMany({
            roomId: input.roomId,
            senderId: { $ne: input.userId },
            isRead: false,
        }, {
            $set: {
                isRead: true,
                readAt,
            },
        });
        return {
            roomId: input.roomId,
            readCount: result.modifiedCount,
            readAt,
        };
    }
    async getUnreadCounts(roomIds, userId) {
        if (!roomIds.length) {
            return new Map();
        }
        const counts = await this.messages
            .aggregate([
            {
                $match: {
                    roomId: { $in: roomIds },
                    senderId: { $ne: userId },
                    isRead: false,
                },
            },
            { $group: { _id: '$roomId', count: { $sum: 1 } } },
        ])
            .toArray();
        return new Map(counts.map((item) => [item._id, item.count]));
    }
    get rooms() {
        return this.db.collection('chat_rooms');
    }
    get messages() {
        return this.db.collection('chat_messages');
    }
    get db() {
        const db = this.dbProvider();
        if (!db) {
            throw new app_error_1.AppError('MongoDB is not configured for chat', 503);
        }
        return db;
    }
    toRoom(room) {
        return {
            id: room.id,
            participants: room.participants,
            type: room.type,
            lastMessageAt: room.lastMessageAt,
            lastMessage: room.lastMessage,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
        };
    }
    toMessage(message) {
        return {
            id: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            fileUrl: message.fileUrl,
            isRead: message.isRead,
            readAt: message.readAt,
            createdAt: message.createdAt,
        };
    }
}
exports.MongoChatRepository = MongoChatRepository;
function normalizeParticipants(participantIds) {
    const participants = [...new Set(participantIds)].sort();
    if (participants.length !== 2) {
        throw new app_error_1.AppError('Direct chat rooms require exactly two participants', 422);
    }
    return [participants[0], participants[1]];
}
function toPreview(message) {
    return {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        createdAt: message.createdAt,
    };
}
