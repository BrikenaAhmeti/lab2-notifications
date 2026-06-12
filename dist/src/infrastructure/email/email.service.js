"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodemailerEmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
const notification_email_templates_1 = require("../../services/email/templates/notification-email-templates");
class NodemailerEmailService {
    transporter;
    async sendNotification(notification, recipientEmail) {
        if (!env_1.env.smtp.host || !recipientEmail) {
            return;
        }
        const email = (0, notification_email_templates_1.renderNotificationEmail)(notification);
        await this.getTransporter().sendMail({
            from: env_1.env.smtp.from,
            to: recipientEmail,
            subject: email.subject,
            text: email.text,
        });
    }
    getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer_1.default.createTransport({
                host: env_1.env.smtp.host,
                port: env_1.env.smtp.port,
                secure: env_1.env.smtp.port === 465,
                auth: env_1.env.smtp.user
                    ? {
                        user: env_1.env.smtp.user,
                        pass: env_1.env.smtp.pass,
                    }
                    : undefined,
            });
        }
        return this.transporter;
    }
}
exports.NodemailerEmailService = NodemailerEmailService;
