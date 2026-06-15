import { ChatMessage } from './chat.entity';

export type ChatMessageNotificationInput = {
    message: ChatMessage;
    recipientIds: string[];
};

export interface ChatMessageNotifier {
    notifyIncomingMessage(input: ChatMessageNotificationInput): Promise<void>;
}
