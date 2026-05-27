import {
    ChatMessage,
    ChatRoom,
    CreateChatMessageInput,
    FindOrCreateDirectRoomInput,
    ListChatMessagesInput,
    ListChatRoomsInput,
    MarkChatRoomReadInput,
    MarkChatRoomReadResult,
    PaginatedChatMessages,
    PaginatedChatRooms,
} from './chat.entity';

export interface ChatRepository {
    findOrCreateDirectRoom(input: FindOrCreateDirectRoomInput): Promise<ChatRoom>;
    findRoomForUser(roomId: string, userId: string): Promise<ChatRoom | null>;
    listRooms(input: ListChatRoomsInput): Promise<PaginatedChatRooms>;
    createMessage(input: CreateChatMessageInput): Promise<ChatMessage>;
    listMessages(input: ListChatMessagesInput): Promise<PaginatedChatMessages>;
    markRoomRead(input: MarkChatRoomReadInput): Promise<MarkChatRoomReadResult>;
}
