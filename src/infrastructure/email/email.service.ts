import nodemailer, { Transporter } from 'nodemailer';

import { env } from '../../config/env';
import {
    EmailNotificationContent,
    NotificationEmailService,
} from '../../modules/notifications/domain/notification-email.service';
import { renderNotificationEmail } from '../../services/email/templates/notification-email-templates';

export class NodemailerEmailService implements NotificationEmailService {
    private transporter?: Transporter;

    async sendNotification(
        notification: EmailNotificationContent,
        recipientEmail?: string,
    ): Promise<void> {
        if (!env.smtp.host || !recipientEmail) {
            return;
        }

        const email = renderNotificationEmail(notification);

        await this.getTransporter().sendMail({
            from: env.smtp.from,
            to: recipientEmail,
            subject: email.subject,
            text: email.text,
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
