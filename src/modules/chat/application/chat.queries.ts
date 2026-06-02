import { Query, QueryHandler } from '../../../shared/core/buses/query-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { ChatRoomSummary, PaginatedChatMessages, PaginatedChatRoomsView } from '../domain/chat.entity';
import { ChatParticipantDirectory } from '../domain/chat-participant-directory';
import { ChatRepository } from '../domain/chat.repository';

export class ListChatRoomsQuery implements Query {
    constructor(
        public readonly userId: string,
        public readonly page: number,
        public readonly limit: number,
    ) {}
}

export class ListChatMessagesQuery implements Query {
    constructor(
        public readonly roomId: string,
        public readonly userId: string,
        public readonly page: number,
        public readonly limit: number,
    ) {}
}

export class ListChatRoomsHandler
    implements QueryHandler<ListChatRoomsQuery, PaginatedChatRoomsView>
{
    constructor(
        private readonly repository: ChatRepository,
        private readonly participantDirectory?: ChatParticipantDirectory,
    ) {}

    async execute(query: ListChatRoomsQuery): Promise<PaginatedChatRoomsView> {
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

    private async enrichParticipants(rooms: ChatRoomSummary[]) {
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
            participants: room.participants.map((participantId) =>
                profiles.get(participantId) ?? participantId,
            ),
        }));
    }
}

export class ListChatMessagesHandler
    implements QueryHandler<ListChatMessagesQuery, PaginatedChatMessages>
{
    constructor(private readonly repository: ChatRepository) {}

    async execute(query: ListChatMessagesQuery): Promise<PaginatedChatMessages> {
        const room = await this.repository.findRoomForUser(query.roomId, query.userId);

        if (!room) {
            throw new AppError('Chat room not found', 404);
        }

        return this.repository.listMessages({
            roomId: query.roomId,
            userId: query.userId,
            page: query.page,
            limit: query.limit,
        });
    }
}
