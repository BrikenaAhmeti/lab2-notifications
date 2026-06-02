export const chatRoomTypes = ['direct'] as const;
export const chatMessageTypes = ['text', 'file', 'image'] as const;
export const chatParticipantRoles = [
    'patient',
    'doctor',
    'staff',
    'nurse',
    'lab_technician',
    'pharmacist',
    'receptionist',
    'admin',
    'department_head',
    'super_admin',
] as const;

export type ChatRoomType = (typeof chatRoomTypes)[number];
export type ChatMessageType = (typeof chatMessageTypes)[number];
export type ChatParticipantRole = (typeof chatParticipantRoles)[number];

export type ChatMessagePreview = {
    id: string;
    senderId: string;
    content: string;
    type: ChatMessageType;
    fileUrl: string | null;
    createdAt: Date;
};

export type ChatParticipantProfile = {
    id: string;
    userId: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    username?: string | null;
    phone?: string | null;
    avatarFileId?: string | null;
    role?: string;
    roles?: string[];
};

export type ChatParticipantView = string | ChatParticipantProfile;

export type ChatRoom = {
    id: string;
    participants: string[];
    type: ChatRoomType;
    lastMessageAt: Date | null;
    lastMessage: ChatMessagePreview | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ChatRoomSummary = ChatRoom & {
    unreadCount: number;
};

export type ChatRoomSummaryView = Omit<ChatRoomSummary, 'participants'> & {
    participants: ChatParticipantView[];
};

export type ChatMessage = {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    type: ChatMessageType;
    fileUrl: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
};

export type FindOrCreateDirectRoomInput = {
    participantIds: [string, string];
};

export type CreateChatMessageInput = {
    roomId: string;
    senderId: string;
    content: string;
    type: ChatMessageType;
    fileUrl: string | null;
};

export type ListChatRoomsInput = {
    userId: string;
    page: number;
    limit: number;
};

export type ListChatMessagesInput = {
    roomId: string;
    userId: string;
    page: number;
    limit: number;
};

export type MarkChatRoomReadInput = {
    roomId: string;
    userId: string;
};

export type MarkChatRoomReadResult = {
    roomId: string;
    readCount: number;
    readAt: Date;
};

export type ChatAttachment = {
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    size: number;
};

export type StoreChatAttachmentInput = {
    roomId: string;
    userId: string;
    fileName: string;
    mimeType?: string;
    bytes: Buffer;
};

export type PaginatedChatRooms = {
    data: ChatRoomSummary[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
};

export type PaginatedChatRoomsView = Omit<PaginatedChatRooms, 'data'> & {
    data: ChatRoomSummaryView[];
};

export type PaginatedChatMessages = {
    data: ChatMessage[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
};
