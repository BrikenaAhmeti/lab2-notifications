import { env } from '../config/env';
import { NotificationService } from '../modules/notifications/application/notification.service';

type ReminderWindow = '24h' | '1h';

type ReminderAppointment = {
    id: string;
    scheduledAt: string;
    patient: {
        userId: string | null;
        email: string | null;
        name: string;
    };
    staff: {
        displayName: string;
    } | null;
    service: {
        name: string;
    };
    department: {
        name: string;
    };
};

type CoreReminderResponse = {
    data: ReminderAppointment[];
};

const RUN_EVERY_MS = 30 * 60 * 1000;
const LOOKAHEAD_MS = 30 * 60 * 1000;

function addMs(date: Date, ms: number) {
    return new Date(date.getTime() + ms);
}

function formatDateTime(value: string) {
    return `${new Date(value).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export class AppointmentReminderJob {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly coreServiceUrl = env.coreServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
        private readonly fetcher: typeof fetch = fetch,
    ) {}

    async runOnce(now = new Date()) {
        if (!this.coreServiceUrl || !this.internalApiKey) {
            return;
        }

        await Promise.all([
            this.sendWindow('24h', now),
            this.sendWindow('1h', now),
        ]);
    }

    private async sendWindow(window: ReminderWindow, now: Date) {
        const offsetMs = window === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
        const from = addMs(now, offsetMs);
        const to = addMs(from, LOOKAHEAD_MS);
        const appointments = await this.fetchAppointments(from, to);

        await Promise.all(
            appointments.map((appointment) => this.sendReminder(window, appointment)),
        );
    }

    private async fetchAppointments(from: Date, to: Date) {
        const url = new URL('/internal/appointments/reminders', this.coreServiceUrl);
        url.searchParams.set('from', from.toISOString());
        url.searchParams.set('to', to.toISOString());

        const response = await this.fetcher(url, {
            headers: {
                'x-internal-api-key': this.internalApiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Core service returned ${response.status}`);
        }

        const body = (await response.json()) as CoreReminderResponse;
        return body.data;
    }

    private async sendReminder(window: ReminderWindow, appointment: ReminderAppointment) {
        if (!appointment.patient.userId) {
            return;
        }

        const is24h = window === '24h';
        const title = is24h
            ? 'Appointment reminder'
            : 'Appointment starts soon';

        await this.notificationService.create({
            userId: appointment.patient.userId,
            type: is24h ? 'appointment.reminder.24h' : 'appointment.reminder.1h',
            title,
            message: `${appointment.service.name} in ${appointment.department.name} is scheduled for ${formatDateTime(
                appointment.scheduledAt,
            )}.`,
            link: `/patient/appointments/${appointment.id}`,
            channels: is24h ? ['in_app', 'email'] : ['in_app'],
            recipientEmail: appointment.patient.email ?? undefined,
            dedupeByTypeAndLink: true,
        });
    }
}

export function startAppointmentReminderJob(notificationService: NotificationService) {
    if (!env.appointmentReminderJobEnabled || !env.coreServiceUrl || !env.internalApiKey) {
        return { stop: () => undefined };
    }

    const job = new AppointmentReminderJob(notificationService);
    void job.runOnce();
    const timer = setInterval(() => {
        void job.runOnce();
    }, RUN_EVERY_MS);

    return {
        stop: () => clearInterval(timer),
    };
}
