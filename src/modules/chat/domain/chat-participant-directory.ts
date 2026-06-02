import { ChatParticipantProfile } from './chat.entity';

export interface ChatParticipantDirectory {
    listByUserIds(userIds: string[]): Promise<Map<string, ChatParticipantProfile>>;
}
