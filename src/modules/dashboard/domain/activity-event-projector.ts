import { CreateActivityInput } from './activity.entity';

export const activityDomainEventTypes = [
    'appointment.status_changed',
    'appointment.booked',
    'appointment.confirmed',
    'appointment.cancelled',
    'appointment.rescheduled',
    'appointment.no_show',
    'appointment.ai_booked',
    'lab.result_entered',
    'lab.results.completed',
    'lab.results.reviewed',
    'payment.recorded',
    'inventory.stock_alert',
    'inventory.low_stock',
    'inventory.expiry_warning',
    'prescription.medication_out_of_stock',
] as const;

export type ActivityDomainEventType = (typeof activityDomainEventTypes)[number];

export type ActivityDomainEventInput = {
    type: ActivityDomainEventType | string;
    data?: Record<string, unknown>;
    occurredAt?: Date;
    fallbackDescription?: string;
    fallbackEntityLink?: string | null;
};

export function projectActivityFromDomainEvent(
    input: ActivityDomainEventInput,
): CreateActivityInput | null {
    const data = input.data ?? {};
    const actorName = text(
        data,
        [
            'activityActorName',
            'actorName',
            'updatedByName',
            'createdByName',
            'staffName',
            'doctorName',
            'receptionistName',
        ],
        'System',
    );
    const createdAt = input.occurredAt ?? dateValue(data, ['occurredAt', 'createdAt', 'timestamp']);

    switch (input.type) {
        case 'appointment.status_changed':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} changed the appointment for ${patientName(data)} to ${statusName(data, 'updated')}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'appointment.booked':
        case 'appointment.ai_booked':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} booked ${appointmentLabel(data)} for ${patientName(data)}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'appointment.confirmed':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} confirmed the appointment for ${patientName(data)}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'appointment.cancelled':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} cancelled the appointment for ${patientName(data)}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'appointment.rescheduled':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} rescheduled the appointment for ${patientName(data)}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'appointment.no_show':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} recorded a no-show for ${patientName(data)}.`,
                actorName,
                entityLabel: appointmentLabel(data),
                entityLink: appointmentLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'lab.result_entered':
        case 'lab.results.completed':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} entered lab results for ${patientName(data)}.`,
                actorName,
                entityLabel: labOrderLabel(data),
                entityLink: labOrderLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'lab.results.reviewed':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} reviewed lab results for ${patientName(data)}.`,
                actorName,
                entityLabel: labOrderLabel(data),
                entityLink: labOrderLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'payment.recorded':
            return withOverrides(data, {
                actionType: input.type,
                description: `${actorName} recorded a ${paymentAmount(data)} payment for ${patientName(data)}.`,
                actorName,
                entityLabel: billingLabel(data),
                entityLink: billingLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'inventory.stock_alert':
        case 'inventory.low_stock':
            return withOverrides(data, {
                actionType: input.type,
                description: `${inventoryItemName(data)} is below its reorder level.`,
                actorName,
                entityLabel: inventoryItemName(data),
                entityLink: inventoryLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'inventory.expiry_warning':
            return withOverrides(data, {
                actionType: input.type,
                description: `${inventoryItemName(data)} is nearing expiry.`,
                actorName,
                entityLabel: inventoryItemName(data),
                entityLink: inventoryLink(data, input.fallbackEntityLink),
                createdAt,
            });
        case 'prescription.medication_out_of_stock':
            return withOverrides(data, {
                actionType: input.type,
                description: `${text(data, ['medicationName', 'itemName'], 'A medication')} is out of stock.`,
                actorName,
                entityLabel: text(data, ['medicationName', 'itemName'], 'Medication'),
                entityLink: linkFrom(data, ['activityEntityLink', 'entityLink'], ['prescriptionId'], '/prescriptions', input.fallbackEntityLink),
                createdAt,
            });
        default:
            return null;
    }
}

function withOverrides(
    data: Record<string, unknown>,
    input: CreateActivityInput,
): CreateActivityInput {
    return {
        ...input,
        description: text(data, ['activityDescription'], input.description),
        actorName: text(data, ['activityActorName'], input.actorName),
        entityLabel: text(data, ['activityEntityLabel'], input.entityLabel),
        entityLink: optionalText(data, ['activityEntityLink']) ?? input.entityLink,
        actorId: optionalText(data, ['actorId']),
        entityType: optionalText(data, ['entityType']),
        entityId: optionalText(data, ['entityId']),
        facilityId: optionalText(data, ['facilityId']),
        departmentId: optionalText(data, ['departmentId']),
        metadata: data,
    };
}

function patientName(data: Record<string, unknown>) {
    return text(data, ['patientName', 'customerName'], 'a patient');
}

function appointmentLabel(data: Record<string, unknown>) {
    return text(
        data,
        ['activityEntityLabel', 'appointmentLabel', 'entityLabel', 'serviceName'],
        `Appointment for ${patientName(data)}`,
    );
}

function appointmentLink(data: Record<string, unknown>, fallback?: string | null) {
    return linkFrom(
        data,
        ['activityEntityLink', 'entityLink', 'appointmentLink'],
        ['appointmentId', 'entityId'],
        '/appointments',
        fallback,
    );
}

function labOrderLabel(data: Record<string, unknown>) {
    const id = optionalText(data, ['labOrderId', 'entityId']);

    return text(
        data,
        ['activityEntityLabel', 'labOrderLabel', 'entityLabel', 'testName'],
        id ? `Lab order ${id}` : `Lab results for ${patientName(data)}`,
    );
}

function labOrderLink(data: Record<string, unknown>, fallback?: string | null) {
    return linkFrom(
        data,
        ['activityEntityLink', 'entityLink', 'labOrderLink'],
        ['labOrderId', 'entityId'],
        '/lab/orders',
        fallback,
    );
}

function billingLabel(data: Record<string, unknown>) {
    return text(
        data,
        ['activityEntityLabel', 'billingLabel', 'invoiceNumber', 'entityLabel'],
        `Billing for ${patientName(data)}`,
    );
}

function billingLink(data: Record<string, unknown>, fallback?: string | null) {
    return linkFrom(
        data,
        ['activityEntityLink', 'entityLink', 'billingLink'],
        ['billingId', 'invoiceId', 'entityId'],
        '/admin/billing',
        fallback,
    );
}

function inventoryItemName(data: Record<string, unknown>) {
    return text(data, ['activityEntityLabel', 'itemName', 'inventoryItemName', 'entityLabel'], 'Inventory item');
}

function inventoryLink(data: Record<string, unknown>, fallback?: string | null) {
    return linkFrom(
        data,
        ['activityEntityLink', 'entityLink', 'inventoryLink'],
        ['inventoryItemId', 'itemId', 'entityId'],
        '/admin/inventory/items',
        fallback,
    );
}

function statusName(data: Record<string, unknown>, fallback: string) {
    return humanize(text(data, ['status', 'newStatus', 'appointmentStatus'], fallback));
}

function paymentAmount(data: Record<string, unknown>) {
    const amount = data.amount;
    const currency = text(data, ['currency'], '');

    if (typeof amount === 'number' && Number.isFinite(amount)) {
        return `${amount.toFixed(2)}${currency ? ` ${currency}` : ''}`;
    }

    if (typeof amount === 'string' && amount.trim()) {
        return `${amount.trim()}${currency ? ` ${currency}` : ''}`;
    }

    return 'new';
}

function linkFrom(
    data: Record<string, unknown>,
    linkKeys: string[],
    idKeys: string[],
    basePath: string,
    fallback?: string | null,
) {
    const explicit = optionalText(data, linkKeys);

    if (explicit) {
        return explicit;
    }

    const id = optionalText(data, idKeys);

    return id ? `${basePath}/${id}` : fallback ?? null;
}

function text(data: Record<string, unknown>, keys: string[], fallback: string) {
    return optionalText(data, keys) ?? fallback;
}

function optionalText(data: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = data[key];

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
    }

    return undefined;
}

function dateValue(data: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = data[key];
        const date =
            value instanceof Date
                ? value
                : typeof value === 'string' || typeof value === 'number'
                  ? new Date(value)
                  : null;

        if (date && !Number.isNaN(date.getTime())) {
            return date;
        }
    }

    return undefined;
}

function humanize(value: string) {
    return value.replace(/[._-]+/g, ' ').trim().toLowerCase();
}
