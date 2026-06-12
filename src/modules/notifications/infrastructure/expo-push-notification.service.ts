import { Notification } from '../domain/notification.entity';
import { PushNotificationService } from '../domain/push-notification.service';
import { PushTokenRepository } from '../domain/push-token.repository';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoPushTicket = {
    status: 'ok' | 'error';
    details?: {
        error?: string;
    };
};

export class ExpoPushNotificationService implements PushNotificationService {
    constructor(private readonly tokenRepository: PushTokenRepository) {}

    async send(notification: Notification): Promise<void> {
        const tokens = await this.tokenRepository.findByUserId(notification.userId);

        if (tokens.length === 0) return;

        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                tokens.map((to) => ({
                    to,
                    sound: 'default',
                    title: notification.title,
                    body: notification.message,
                    data: {
                        notificationId: notification.id,
                        type: notification.type,
                        link: notification.link,
                    },
                    channelId: 'default',
                    priority: 'high',
                })),
            ),
        });

        if (!response.ok) {
            throw new Error(`Expo Push Service returned ${response.status}`);
        }

        const payload = (await response.json()) as { data?: ExpoPushTicket[] | ExpoPushTicket };
        const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
        const invalidTokens = tickets.flatMap((ticket, index) =>
            ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
                ? [tokens[index]]
                : [],
        );

        await this.tokenRepository.deleteByTokens(invalidTokens);
    }
}
