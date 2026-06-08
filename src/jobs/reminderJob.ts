import { env } from '../config/env';
import { NotificationService } from '../modules/notifications/application/notification.service';

type ReminderWindow = 'day_of' | '2h';

type ReminderAppointment = {
    id: string;
    scheduledAt: string;
    patient: {
        userId: string | null;
        email: string | null;
        name: string;
    };
    staff: {
        userId: string | null;
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

function startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
    return addMs(startOfUtcDay(date), 24 * 60 * 60 * 1000);
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
            this.sendWindow('day_of', now),
            this.sendWindow('2h', now),
        ]);
    }

    private async sendWindow(window: ReminderWindow, now: Date) {
        const from = window === 'day_of' ? now : addMs(now, 2 * 60 * 60 * 1000);
        const to = window === 'day_of' ? endOfUtcDay(now) : addMs(from, LOOKAHEAD_MS);
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
        await Promise.all([
            this.sendPatientReminder(window, appointment),
            this.sendDoctorReminder(window, appointment),
        ]);
    }

    private async sendPatientReminder(window: ReminderWindow, appointment: ReminderAppointment) {
        if (!appointment.patient.userId) return;

        const isTwoHour = window === '2h';
        const title = isTwoHour ? 'Appointment starts in 2 hours' : 'Appointment today';

        await this.notificationService.create({
            userId: appointment.patient.userId,
            type: isTwoHour ? 'appointment.reminder.2h' : 'appointment.reminder.day_of',
            title,
            message: `${appointment.service.name} in ${appointment.department.name} is scheduled for ${formatDateTime(
                appointment.scheduledAt,
            )}.`,
            link: '/patient/appointments',
            channels: ['in_app', 'email'],
            recipientEmail: appointment.patient.email ?? undefined,
            dedupeByTypeAndLink: true,
        });
    }

    private async sendDoctorReminder(window: ReminderWindow, appointment: ReminderAppointment) {
        if (!appointment.staff?.userId) return;

        const isTwoHour = window === '2h';
        const title = isTwoHour ? 'Appointment starts in 2 hours' : 'Appointment today';

        await this.notificationService.create({
            userId: appointment.staff.userId,
            type: isTwoHour
                ? 'appointment.doctor_reminder.2h'
                : 'appointment.doctor_reminder.day_of',
            title,
            message: `${appointment.service.name} with ${appointment.patient.name} is scheduled for ${formatDateTime(
                appointment.scheduledAt,
            )}.`,
            link: `/doctor/consultations/${appointment.id}`,
            channels: ['in_app'],
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
