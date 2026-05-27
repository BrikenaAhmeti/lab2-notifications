import { randomUUID } from 'crypto';
import { Collection, Db, Filter } from 'mongodb';

import { AppError } from '../../../shared/core/errors/app-error';
import {
    ChatMessage,
    ChatMessagePreview,
    ChatRoom,
    ChatRoomSummary,
    CreateChatMessageInput,
    FindOrCreateDirectRoomInput,
    ListChatMessagesInput,
    ListChatRoomsInput,
    MarkChatRoomReadInput,
    MarkChatRoomReadResult,
    PaginatedChatMessages,
    PaginatedChatRooms,
} from '../domain/chat.entity';
import { ChatRepository } from '../domain/chat.repository';

type ChatRoomDocument = {
    id: string;
    directKey: string;
    participants: string[];
    type: 'direct';
    lastMessageAt: Date | null;
    lastMessage: ChatMessagePreview | null;
    createdAt: Date;
    updatedAt: Date;
};

type ChatMessageDocument = ChatMessage;

export class MongoChatRepository implements ChatRepository {
    constructor(private readonly dbProvider: () => Db | undefined) {}

    async findOrCreateDirectRoom(input: FindOrCreateDirectRoomInput): Promise<ChatRoom> {
        const participants = normalizeParticipants(input.participantIds);
        const now = new Date();

        const room = await this.rooms.findOneAndUpdate(
            { directKey: participants.join(':') },
            {
                $setOnInsert: {
                    id: randomUUID(),
                    directKey: participants.join(':'),
                    participants,
                    type: 'direct',
                    lastMessageAt: null,
                    lastMessage: null,
                    createdAt: now,
                    updatedAt: now,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
            },
        );

        if (!room) {
            throw new AppError('Unable to create chat room', 500);
        }

        return this.toRoom(room);
    }

    async findRoomForUser(roomId: string, userId: string): Promise<ChatRoom | null> {
        const room = await this.rooms.findOne({ id: roomId, participants: userId });

        return room ? this.toRoom(room) : null;
    }

    async listRooms(input: ListChatRoomsInput): Promise<PaginatedChatRooms> {
        const filter: Filter<ChatRoomDocument> = { participants: input.userId };
        const [rooms, totalItems] = await Promise.all([
            this.rooms
                .find(filter)
                .sort({ lastMessageAt: -1, createdAt: -1 })
                .skip((input.page - 1) * input.limit)
                .limit(input.limit)
                .toArray(),
            this.rooms.countDocuments(filter),
        ]);
        const unreadCounts = await this.getUnreadCounts(
            rooms.map((room) => room.id),
            input.userId,
        );

        return {
            data: rooms.map((room): ChatRoomSummary => ({
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

    async createMessage(input: CreateChatMessageInput): Promise<ChatMessage> {
        const createdAt = new Date();
        const message: ChatMessageDocument = {
            id: randomUUID(),
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
        await this.rooms.updateOne(
            { id: input.roomId },
            {
                $set: {
                    lastMessageAt: createdAt,
                    lastMessage: toPreview(message),
                    updatedAt: createdAt,
                },
            },
        );

        return message;
    }

    async listMessages(input: ListChatMessagesInput): Promise<PaginatedChatMessages> {
        const filter: Filter<ChatMessageDocument> = { roomId: input.roomId };
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

    async markRoomRead(input: MarkChatRoomReadInput): Promise<MarkChatRoomReadResult> {
        const readAt = new Date();
        const result = await this.messages.updateMany(
            {
                roomId: input.roomId,
                senderId: { $ne: input.userId },
                isRead: false,
            },
            {
                $set: {
                    isRead: true,
                    readAt,
                },
            },
        );

        return {
            roomId: input.roomId,
            readCount: result.modifiedCount,
            readAt,
        };
    }

    private async getUnreadCounts(roomIds: string[], userId: string) {
        if (!roomIds.length) {
            return new Map<string, number>();
        }

        const counts = await this.messages
            .aggregate<{ _id: string; count: number }>([
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

    private get rooms(): Collection<ChatRoomDocument> {
        return this.db.collection<ChatRoomDocument>('chat_rooms');
    }

    private get messages(): Collection<ChatMessageDocument> {
        return this.db.collection<ChatMessageDocument>('chat_messages');
    }

    private get db(): Db {
        const db = this.dbProvider();

        if (!db) {
            throw new AppError('MongoDB is not configured for chat', 503);
        }

        return db;
    }

    private toRoom(room: ChatRoomDocument): ChatRoom {
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

    private toMessage(message: ChatMessageDocument): ChatMessage {
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

function normalizeParticipants(participantIds: [string, string]): [string, string] {
    const participants = [...new Set(participantIds)].sort();

    if (participants.length !== 2) {
        throw new AppError('Direct chat rooms require exactly two participants', 422);
    }

    return [participants[0], participants[1]];
}

function toPreview(message: ChatMessage): ChatMessagePreview {
    return {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        createdAt: message.createdAt,
    };
}
