"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTemplateDefinitions = void 0;
exports.renderNotificationEmail = renderNotificationEmail;
const notification_events_1 = require("../../../modules/notifications/domain/notification-events");
exports.notificationTemplateDefinitions = Object.fromEntries(notification_events_1.notificationEventTypes.map((type) => [
    type,
    { label: notification_events_1.notificationEventDefinitions[type].label },
]));
function renderNotificationEmail(notification) {
    const definition = exports.notificationTemplateDefinitions[notification.type];
    const subject = definition?.label ?? notification.title;
    const body = [
        notification.title,
        '',
        notification.message,
        notification.link ? `\nOpen: ${notification.link}` : '',
    ]
        .filter(Boolean)
        .join('\n');
    return { subject, text: body };
}
