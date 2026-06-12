"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpoPushNotificationService = void 0;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
class ExpoPushNotificationService {
    tokenRepository;
    constructor(tokenRepository) {
        this.tokenRepository = tokenRepository;
    }
    async send(notification) {
        const tokens = await this.tokenRepository.findByUserId(notification.userId);
        if (tokens.length === 0)
            return;
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokens.map((to) => ({
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
            }))),
        });
        if (!response.ok) {
            throw new Error(`Expo Push Service returned ${response.status}`);
        }
        const payload = (await response.json());
        const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
        const invalidTokens = tickets.flatMap((ticket, index) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
            ? [tokens[index]]
            : []);
        await this.tokenRepository.deleteByTokens(invalidTokens);
    }
}
exports.ExpoPushNotificationService = ExpoPushNotificationService;
