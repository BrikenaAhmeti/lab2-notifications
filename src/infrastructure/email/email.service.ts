import nodemailer, { Transporter } from 'nodemailer';

import { env } from '../../config/env';
import { Notification } from '../../modules/notifications/domain/notification.entity';
import { NotificationEmailService } from '../../modules/notifications/domain/notification-email.service';

export class NodemailerEmailService implements NotificationEmailService {
    private transporter?: Transporter;

    async sendNotification(notification: Notification, recipientEmail?: string): Promise<void> {
        if (!env.smtp.host || !recipientEmail) {
            return;
        }

        await this.getTransporter().sendMail({
            from: env.smtp.from,
            to: recipientEmail,
            subject: notification.title,
            text: `${notification.message}${notification.link ? `\n\n${notification.link}` : ''}`,
        });
    }

    private getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: env.smtp.host,
                port: env.smtp.port,
                secure: env.smtp.port === 465,
                auth: env.smtp.user
                    ? {
                          user: env.smtp.user,
                          pass: env.smtp.pass,
                      }
                    : undefined,
            });
        }

        return this.transporter;
    }
}
