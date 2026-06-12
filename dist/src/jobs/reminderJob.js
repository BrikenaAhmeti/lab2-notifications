"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentReminderJob = void 0;
exports.startAppointmentReminderJob = startAppointmentReminderJob;
const env_1 = require("../config/env");
const RUN_EVERY_MS = 30 * 60 * 1000;
const LOOKAHEAD_MS = 30 * 60 * 1000;
function addMs(date, ms) {
    return new Date(date.getTime() + ms);
}
function formatDateTime(value) {
    return `${new Date(value).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function endOfUtcDay(date) {
    return addMs(startOfUtcDay(date), 24 * 60 * 60 * 1000);
}
class AppointmentReminderJob {
    notificationService;
    coreServiceUrl;
    internalApiKey;
    fetcher;
    constructor(notificationService, coreServiceUrl = env_1.env.coreServiceUrl, internalApiKey = env_1.env.internalApiKey, fetcher = fetch) {
        this.notificationService = notificationService;
        this.coreServiceUrl = coreServiceUrl;
        this.internalApiKey = internalApiKey;
        this.fetcher = fetcher;
    }
    async runOnce(now = new Date()) {
        if (!this.coreServiceUrl || !this.internalApiKey) {
            return;
        }
        await Promise.all([
            this.sendWindow('day_of', now),
            this.sendWindow('2h', now),
        ]);
    }
    async sendWindow(window, now) {
        const from = window === 'day_of' ? now : addMs(now, 2 * 60 * 60 * 1000);
        const to = window === 'day_of' ? endOfUtcDay(now) : addMs(from, LOOKAHEAD_MS);
        const appointments = await this.fetchAppointments(from, to);
        await Promise.all(appointments.map((appointment) => this.sendReminder(window, appointment)));
    }
    async fetchAppointments(from, to) {
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
        const body = (await response.json());
        return body.data;
    }
    async sendReminder(window, appointment) {
        await Promise.all([
            this.sendPatientReminder(window, appointment),
            this.sendDoctorReminder(window, appointment),
        ]);
    }
    async sendPatientReminder(window, appointment) {
        if (!appointment.patient.userId)
            return;
        const isTwoHour = window === '2h';
        const title = isTwoHour ? 'Appointment starts in 2 hours' : 'Appointment today';
        await this.notificationService.create({
            userId: appointment.patient.userId,
            type: isTwoHour ? 'appointment.reminder.2h' : 'appointment.reminder.day_of',
            title,
            message: `${appointment.service.name} in ${appointment.department.name} is scheduled for ${formatDateTime(appointment.scheduledAt)}.`,
            link: '/patient/appointments',
            channels: ['in_app', 'email'],
            recipientEmail: appointment.patient.email ?? undefined,
            dedupeByTypeAndLink: true,
        });
    }
    async sendDoctorReminder(window, appointment) {
        if (!appointment.staff?.userId)
            return;
        const isTwoHour = window === '2h';
        const title = isTwoHour ? 'Appointment starts in 2 hours' : 'Appointment today';
        await this.notificationService.create({
            userId: appointment.staff.userId,
            type: isTwoHour
                ? 'appointment.doctor_reminder.2h'
                : 'appointment.doctor_reminder.day_of',
            title,
            message: `${appointment.service.name} with ${appointment.patient.name} is scheduled for ${formatDateTime(appointment.scheduledAt)}.`,
            link: `/doctor/consultations/${appointment.id}`,
            channels: ['in_app'],
            dedupeByTypeAndLink: true,
        });
    }
}
exports.AppointmentReminderJob = AppointmentReminderJob;
function startAppointmentReminderJob(notificationService) {
    if (!env_1.env.appointmentReminderJobEnabled || !env_1.env.coreServiceUrl || !env_1.env.internalApiKey) {
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
