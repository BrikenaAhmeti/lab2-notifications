"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListChatMessagesHandler = exports.ListChatRoomsHandler = exports.ListChatMessagesQuery = exports.ListChatRoomsQuery = void 0;
const app_error_1 = require("../../../shared/core/errors/app-error");
class ListChatRoomsQuery {
    userId;
    page;
    limit;
    constructor(userId, page, limit) {
        this.userId = userId;
        this.page = page;
        this.limit = limit;
    }
}
exports.ListChatRoomsQuery = ListChatRoomsQuery;
class ListChatMessagesQuery {
    roomId;
    userId;
    page;
    limit;
    constructor(roomId, userId, page, limit) {
        this.roomId = roomId;
        this.userId = userId;
        this.page = page;
        this.limit = limit;
    }
}
exports.ListChatMessagesQuery = ListChatMessagesQuery;
class ListChatRoomsHandler {
    repository;
    participantDirectory;
    constructor(repository, participantDirectory) {
        this.repository = repository;
        this.participantDirectory = participantDirectory;
    }
    async execute(query) {
        const result = await this.repository.listRooms({
            userId: query.userId,
            page: query.page,
            limit: query.limit,
        });
        return {
            ...result,
            data: await this.enrichParticipants(result.data),
        };
    }
    async enrichParticipants(rooms) {
        if (!this.participantDirectory || rooms.length === 0) {
            return rooms;
        }
        const participantIds = rooms.flatMap((room) => room.participants);
        const profiles = await this.participantDirectory.listByUserIds(participantIds);
        if (profiles.size === 0) {
            return rooms;
        }
        return rooms.map((room) => ({
            ...room,
            participants: room.participants.map((participantId) => profiles.get(participantId) ?? participantId),
        }));
    }
}
exports.ListChatRoomsHandler = ListChatRoomsHandler;
class ListChatMessagesHandler {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(query) {
        const room = await this.repository.findRoomForUser(query.roomId, query.userId);
        if (!room) {
            throw new app_error_1.AppError('Chat room not found', 404);
        }
        return this.repository.listMessages({
            roomId: query.roomId,
            userId: query.userId,
            page: query.page,
            limit: query.limit,
        });
    }
}
exports.ListChatMessagesHandler = ListChatMessagesHandler;
