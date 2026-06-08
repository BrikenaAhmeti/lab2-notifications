import { Notification, NotificationChannel } from './notification.entity';

export const notificationEventTypes = [
    'appointment.booked',
    'appointment.confirmed',
    'appointment.reminder.24h',
    'appointment.reminder.1h',
    'appointment.reminder.day_of',
    'appointment.reminder.2h',
    'appointment.doctor_reminder.day_of',
    'appointment.doctor_reminder.2h',
    'appointment.cancelled',
    'appointment.rescheduled',
    'appointment.no_show',
    'appointment.completed_report',
    'lab.results.completed',
    'lab.results.ready',
    'lab.results.reviewed',
    'billing.payment_reminder',
    'billing.invoice_paid',
    'prescription.created',
    'prescription.ready_for_pickup',
    'prescription.medication_out_of_stock',
    'inventory.low_stock',
    'inventory.expiry_warning',
    'feedback.created',
    'contact.submitted',
    'account.verification',
    'account.password_reset',
    'chat.message.created',
    'appointment.ai_booked',
] as const;

export const notificationRecipientRoles = [
    'patient',
    'staff',
    'doctor',
    'admin',
    'department_head',
    'user',
    'recipient',
] as const;

export type NotificationEventType = (typeof notificationEventTypes)[number];
export type NotificationRecipientRole = (typeof notificationRecipientRoles)[number];
export type NotificationEventData = Record<string, unknown>;

export type NotificationRecipient = {
    role: NotificationRecipientRole;
    userId?: string;
    email?: string;
    link?: string | null;
};

export type SendTypedNotificationInput = {
    type: NotificationEventType;
    recipients: NotificationRecipient[];
    data?: NotificationEventData;
    title?: string;
    message?: string;
    link?: string | null;
    dedupeByTypeAndLink?: boolean;
};

export type TypedNotificationResult = {
    notifications: Notification[];
    emailOnlyCount: number;
};

type RenderedNotificationContent = {
    title: string;
    message: string;
    link?: string | null;
};

type NotificationEventDefinition = {
    label: string;
    channels: readonly NotificationChannel[];
    recipientRoles: readonly NotificationRecipientRole[];
    render: (data: NotificationEventData) => RenderedNotificationContent;
};

function text(data: NotificationEventData, key: string, fallback: string) {
    const value = data[key];
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function idLink(data: NotificationEventData, key: string, path: string) {
    const value = data[key];
    return typeof value === 'string' && value.trim() ? `${path}/${value.trim()}` : null;
}

function appointmentRoleLink(
    data: NotificationEventData,
    role: NotificationRecipientRole,
) {
    if (role === 'staff' || role === 'doctor') {
        return idLink(data, 'appointmentId', '/doctor/consultations') ?? '/doctor';
    }

    return '/patient/appointments';
}

function scheduledAt(data: NotificationEventData) {
    const value = text(data, 'scheduledAt', 'the scheduled time');
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return `${parsed.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function appointmentDetails(data: NotificationEventData) {
    const service = text(data, 'serviceName', 'Appointment');
    const department = text(data, 'departmentName', 'your department');

    return `${service} in ${department}`;
}

function amount(data: NotificationEventData) {
    const value = data.amountDue ?? data.totalAmount ?? data.amount;
    const numeric = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numeric)) {
        return text(data, 'amountDue', 'the outstanding balance');
    }

    return `EUR ${numeric.toFixed(2)}`;
}

function dueDate(data: NotificationEventData) {
    return text(data, 'dueDate', 'the due date');
}

export const notificationEventDefinitions: Record<
    NotificationEventType,
    NotificationEventDefinition
> = {
    'appointment.booked': {
        label: 'Appointment booked',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient', 'staff'],
        render: (data) => ({
            title: 'Appointment booked',
            message: `${appointmentDetails(data)} has been booked for ${scheduledAt(data)}.`,
            link: text(data, 'appointmentLink', '') || '/patient/appointments',
        }),
    },
    'appointment.confirmed': {
        label: 'Appointment confirmed',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Appointment confirmed',
            message: `${appointmentDetails(data)} has been confirmed for ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.reminder.24h': {
        label: 'Appointment reminder',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Appointment reminder',
            message: `${appointmentDetails(data)} is scheduled for ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.reminder.1h': {
        label: 'Appointment reminder',
        channels: ['in_app'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Appointment starts soon',
            message: `${appointmentDetails(data)} starts at ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.reminder.day_of': {
        label: 'Appointment reminder',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Appointment today',
            message: `${appointmentDetails(data)} is scheduled today for ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.reminder.2h': {
        label: 'Appointment starts soon',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Appointment starts in 2 hours',
            message: `${appointmentDetails(data)} starts at ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.doctor_reminder.day_of': {
        label: 'Doctor appointment reminder',
        channels: ['in_app'],
        recipientRoles: ['doctor'],
        render: (data) => ({
            title: 'Appointment today',
            message: `${appointmentDetails(data)} with ${text(data, 'patientName', 'a patient')} is scheduled today for ${scheduledAt(data)}.`,
            link: idLink(data, 'appointmentId', '/doctor/consultations'),
        }),
    },
    'appointment.doctor_reminder.2h': {
        label: 'Doctor appointment reminder',
        channels: ['in_app'],
        recipientRoles: ['doctor'],
        render: (data) => ({
            title: 'Appointment starts in 2 hours',
            message: `${appointmentDetails(data)} with ${text(data, 'patientName', 'a patient')} starts at ${scheduledAt(data)}.`,
            link: idLink(data, 'appointmentId', '/doctor/consultations'),
        }),
    },
    'appointment.cancelled': {
        label: 'Appointment cancelled',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient', 'staff'],
        render: (data) => ({
            title: 'Appointment cancelled',
            message: `${appointmentDetails(data)} scheduled for ${scheduledAt(data)} was cancelled.`,
            link: text(data, 'appointmentLink', '') || '/patient/appointments',
        }),
    },
    'appointment.rescheduled': {
        label: 'Appointment rescheduled',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient', 'staff'],
        render: (data) => ({
            title: 'Appointment rescheduled',
            message: `${appointmentDetails(data)} was rescheduled to ${scheduledAt(data)}.`,
            link: text(data, 'appointmentLink', '') || '/patient/appointments',
        }),
    },
    'appointment.no_show': {
        label: 'No-show recorded',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'No-show recorded',
            message: `A no-show was recorded for ${appointmentDetails(data)} scheduled for ${scheduledAt(data)}.`,
            link: '/patient/appointments',
        }),
    },
    'appointment.completed_report': {
        label: 'Consultation report ready',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Consultation report ready',
            message: `Your consultation report for ${appointmentDetails(data)} is ready to view in your portal.`,
            link: text(data, 'reportLink', '') || '/patient/medical-records',
        }),
    },
    'lab.results.completed': {
        label: 'Lab results ready for review',
        channels: ['in_app'],
        recipientRoles: ['doctor'],
        render: (data) => ({
            title: 'Lab results ready for review',
            message: `Lab results for ${text(data, 'patientName', 'your patient')} are complete and ready for review: ${text(data, 'testNames', 'lab tests')}.`,
            link: idLink(data, 'labOrderId', '/doctor/lab-reviews'),
        }),
    },
    'lab.results.ready': {
        label: 'Lab results ready',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Lab results ready',
            message: `Your lab results are ready to view: ${text(data, 'testNames', 'lab tests')}.`,
            link: '/patient/lab-results',
        }),
    },
    'lab.results.reviewed': {
        label: 'Lab results ready',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Lab results ready',
            message: 'Your reviewed lab results are ready to view in your portal.',
            link: '/patient/lab-results',
        }),
    },
    'billing.payment_reminder': {
        label: 'Billing payment reminder',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Billing reminder',
            message: `Payment reminder for invoice ${text(data, 'billingNumber', 'your invoice')}: ${amount(data)} is due by ${dueDate(data)}.`,
            link: '/patient/billing',
        }),
    },
    'billing.invoice_paid': {
        label: 'Paid invoice',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Invoice paid',
            message: `Invoice ${text(data, 'billingNumber', 'your invoice')} has been marked as paid. Your invoice is available in your portal.`,
            link: '/patient/billing',
        }),
    },
    'prescription.created': {
        label: 'New prescription created',
        channels: ['in_app'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'New prescription created',
            message: `${text(data, 'doctorName', 'Your doctor')} created a new prescription for you.`,
            link: '/patient/prescriptions',
        }),
    },
    'prescription.ready_for_pickup': {
        label: 'Prescription ready for pickup',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Prescription ready for pickup',
            message: 'Your prescription is ready for pickup at the pharmacy.',
            link: '/patient/prescriptions',
        }),
    },
    'prescription.medication_out_of_stock': {
        label: 'Medication out of stock',
        channels: ['in_app'],
        recipientRoles: ['patient', 'doctor'],
        render: (data) => ({
            title: 'Medication out of stock',
            message: `${text(data, 'medicationName', 'A prescribed medication')} is currently out of stock.`,
            link: '/patient/prescriptions',
        }),
    },
    'inventory.low_stock': {
        label: 'Low stock alert',
        channels: ['in_app'],
        recipientRoles: ['admin', 'department_head'],
        render: (data) => ({
            title: 'Low stock alert',
            message: `${text(data, 'itemName', 'An inventory item')} is below its reorder level.`,
            link: '/admin/inventory',
        }),
    },
    'inventory.expiry_warning': {
        label: 'Inventory expiry warning',
        channels: ['in_app'],
        recipientRoles: ['admin', 'department_head'],
        render: (data) => ({
            title: 'Inventory expiry warning',
            message: `${text(data, 'itemName', 'An inventory item')} expires on ${text(data, 'expiresAt', 'the configured expiry date')}.`,
            link: '/admin/inventory',
        }),
    },
    'feedback.created': {
        label: 'New patient feedback',
        channels: ['in_app'],
        recipientRoles: ['doctor'],
        render: (data) => ({
            title: 'New patient feedback',
            message: `New patient feedback was submitted for ${text(data, 'doctorName', 'you')}.`,
            link: idLink(data, 'feedbackId', '/doctor/feedback'),
        }),
    },
    'contact.submitted': {
        label: 'New contact form submission',
        channels: ['in_app'],
        recipientRoles: ['admin'],
        render: (data) => ({
            title: 'New contact form submission',
            message: `A new contact form submission from ${text(data, 'senderName', 'a website visitor')} needs review.`,
            link: '/admin/contact',
        }),
    },
    'account.verification': {
        label: 'Account verification',
        channels: ['email'],
        recipientRoles: ['patient'],
        render: (data) => ({
            title: 'Verify your MedSphere account',
            message: 'Use the verification link to activate your MedSphere account.',
            link: text(data, 'verificationUrl', '') || null,
        }),
    },
    'account.password_reset': {
        label: 'Password reset',
        channels: ['email'],
        recipientRoles: ['user'],
        render: (data) => ({
            title: 'Reset your MedSphere password',
            message: 'Use the password reset link to set a new MedSphere password.',
            link: text(data, 'resetUrl', '') || null,
        }),
    },
    'chat.message.created': {
        label: 'New chat message',
        channels: ['in_app'],
        recipientRoles: ['recipient'],
        render: (data) => ({
            title: 'New chat message',
            message: `You have a new chat message from ${text(data, 'senderName', 'a MedSphere user')}.`,
            link: idLink(data, 'roomId', '/messages'),
        }),
    },
    'appointment.ai_booked': {
        label: 'AI appointment booked',
        channels: ['in_app', 'email'],
        recipientRoles: ['patient', 'staff'],
        render: (data) => ({
            title: 'AI appointment booked',
            message: `${appointmentDetails(data)} was booked by the AI reservation agent for ${scheduledAt(data)}.`,
            link: idLink(data, 'appointmentId', '/appointments'),
        }),
    },
};

export function renderNotificationEvent(
    type: NotificationEventType,
    data: NotificationEventData = {},
): RenderedNotificationContent {
    return notificationEventDefinitions[type].render(data);
}

export function resolveNotificationEventLink(
    type: NotificationEventType,
    data: NotificationEventData,
    recipientRole: NotificationRecipientRole,
    explicitLink?: string | null,
) {
    if (explicitLink !== undefined) {
        return explicitLink;
    }

    if (
        type === 'appointment.booked' ||
        type === 'appointment.cancelled' ||
        type === 'appointment.rescheduled' ||
        type === 'appointment.ai_booked'
    ) {
        return appointmentRoleLink(data, recipientRole);
    }

    if (type === 'prescription.medication_out_of_stock') {
        return recipientRole === 'doctor' ? '/doctor' : '/patient/prescriptions';
    }

    return renderNotificationEvent(type, data).link ?? null;
}
