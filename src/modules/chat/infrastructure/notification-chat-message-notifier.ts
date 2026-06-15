import { PushNotificationService } from '../../notifications/domain/push-notification.service';
import { ChatMessageNotificationInput, ChatMessageNotifier } from '../domain/chat-message-notifier';
import { ChatMessage } from '../domain/chat.entity';

const MAX_PREVIEW_LENGTH = 120;

function getMessagePreview(message: ChatMessage) {
    if (message.type === 'image') {
        return 'Sent you a photo';
    }

    if (message.type === 'file') {
        return 'Sent you a file';
    }

    const content = message.content.trim();

    if (!content) {
        return 'Sent you a message';
    }

    return content.length > MAX_PREVIEW_LENGTH
        ? `${content.slice(0, MAX_PREVIEW_LENGTH - 1)}...`
        : content;
}

export class NotificationChatMessageNotifier implements ChatMessageNotifier {
    constructor(private readonly pushNotificationService: PushNotificationService) {}

    async notifyIncomingMessage(input: ChatMessageNotificationInput): Promise<void> {
        await Promise.all(
            input.recipientIds.map((recipientId) =>
                this.pushNotificationService.send({
                    id: input.message.id,
                    userId: recipientId,
                    type: 'chat.message.created',
                    title: 'New chat message',
                    message: getMessagePreview(input.message),
                    link: `/messages/${input.message.roomId}`,
                    channels: ['in_app'],
                    isRead: false,
                    readAt: null,
                    createdAt: input.message.createdAt,
                }),
            ),
        );
    }
}
