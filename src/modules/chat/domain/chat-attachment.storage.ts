import { ChatAttachment, StoreChatAttachmentInput } from './chat.entity';

export interface ChatAttachmentStorage {
    store(input: StoreChatAttachmentInput): Promise<ChatAttachment>;
}
