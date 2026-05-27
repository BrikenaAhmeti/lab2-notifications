import { Query, QueryHandler } from '../../../shared/core/buses/query-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { PaginatedChatMessages, PaginatedChatRooms } from '../domain/chat.entity';
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
    implements QueryHandler<ListChatRoomsQuery, PaginatedChatRooms>
{
    constructor(private readonly repository: ChatRepository) {}

    execute(query: ListChatRoomsQuery): Promise<PaginatedChatRooms> {
        return this.repository.listRooms({
            userId: query.userId,
            page: query.page,
            limit: query.limit,
        });
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
