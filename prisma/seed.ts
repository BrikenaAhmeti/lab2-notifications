import 'dotenv/config';
import { MongoClient } from 'mongodb';

import { prisma } from '../src/infrastructure/db/prisma';

const DEMO_USER_IDS = {
    admin: process.env.AUTH_DEMO_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111111',
    clinicAdmin:
        process.env.AUTH_DEMO_CLINIC_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111112',
    doctor: process.env.AUTH_DEMO_DOCTOR_USER_ID ?? '22222222-2222-4222-8222-222222222222',
    cardiologist:
        process.env.AUTH_DEMO_CARDIOLOGIST_USER_ID ?? '22222222-2222-4222-8222-222222222223',
    pediatrician:
        process.env.AUTH_DEMO_PEDIATRICIAN_USER_ID ?? '22222222-2222-4222-8222-222222222224',
    nurse: process.env.AUTH_DEMO_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333333',
    emergencyNurse:
        process.env.AUTH_DEMO_EMERGENCY_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333334',
    receptionist:
        process.env.AUTH_DEMO_RECEPTIONIST_USER_ID ?? '44444444-4444-4444-8444-444444444444',
    labTechnician:
        process.env.AUTH_DEMO_LAB_TECHNICIAN_USER_ID ?? '88888888-8888-4888-8888-888888888888',
    pharmacist:
        process.env.AUTH_DEMO_PHARMACIST_USER_ID ?? '99999999-9999-4999-8999-999999999999',
    patient: process.env.AUTH_DEMO_PATIENT_USER_ID ?? '55555555-5555-4555-8555-555555555555',
    patientSamir:
        process.env.AUTH_DEMO_PATIENT_SAMIR_USER_ID ?? '55555555-5555-4555-8555-555555555556',
    patientLina:
        process.env.AUTH_DEMO_PATIENT_LINA_USER_ID ?? '55555555-5555-4555-8555-555555555557',
} as const;

const LEGACY_INVALID_UUIDS = {
    users: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
    ],
    notifications: [
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000006',
    ],
    activities: [
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
    ],
    rooms: [
        'c0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
    ],
    messages: [
        'c1000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000002',
        'c1000000-0000-0000-0000-000000000003',
    ],
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(days: number) {
    return new Date(Date.now() + days * DAY_MS);
}

interface DemoNotification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string;
    isRead: boolean;
    channels?: string[];
}

const NOTIFICATIONS: DemoNotification[] = [
    {
        id: 'a0000000-0000-4000-8000-000000000001',
        userId: DEMO_USER_IDS.admin,
        type: 'dashboard.summary',
        title: 'Demo clinic is ready',
        message: 'Seed data has populated appointments, billing, lab, and inventory workflows.',
        link: '/admin/dashboard',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000002',
        userId: DEMO_USER_IDS.doctor,
        type: 'lab.results.completed',
        title: 'Lab result awaiting review',
        message: 'Olivia Brown has a completed CBC result ready for review.',
        link: '/doctor/lab-orders/50000000-0000-4000-8000-000000000001',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000003',
        userId: DEMO_USER_IDS.nurse,
        type: 'appointment.checked_in',
        title: 'Patient checked in',
        message: 'Olivia Brown is checked in for the morning consultation.',
        link: '/nurse',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000004',
        userId: DEMO_USER_IDS.receptionist,
        type: 'billing.pending',
        title: 'Pending demo invoice',
        message: 'BILL-DEMO-0002 is ready for payment processing.',
        link: '/receptionist/billing',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000005',
        userId: DEMO_USER_IDS.patient,
        type: 'appointment.reminder',
        title: 'Upcoming appointment',
        message: 'Your MedSphere follow-up appointment is scheduled for tomorrow morning.',
        link: '/patient/appointments',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000006',
        userId: DEMO_USER_IDS.patient,
        type: 'prescription.ready',
        title: 'Prescription in pharmacy queue',
        message: 'A demo prescription is available in the pharmacy workflow.',
        link: '/patient/prescriptions',
        isRead: true,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000007',
        userId: DEMO_USER_IDS.cardiologist,
        type: 'lab.results.completed',
        title: 'Critical lab result ready',
        message: 'Mateo Alvarez has a critical Troponin I result ready for cardiology review.',
        link: '/doctor/lab-orders/a5000000-0000-4000-8000-000000000004',
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000008',
        userId: DEMO_USER_IDS.labTechnician,
        type: 'lab.result_entered',
        title: 'STAT lab result entered',
        message: 'Troponin I was entered and routed to the cardiology doctor queue.',
        link: '/lab/orders/a5000000-0000-4000-8000-000000000004',
        isRead: true,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000009',
        userId: DEMO_USER_IDS.patient,
        type: 'lab.results.reviewed',
        title: 'Lab results ready',
        message: 'Your reviewed CBC result and AI range explanation are ready in the patient portal.',
        link: '/patient/lab-results/50000000-0000-4000-8000-000000000001',
        channels: ['in_app', 'email'],
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000010',
        userId: DEMO_USER_IDS.patientSamir,
        type: 'lab.results.reviewed',
        title: 'Lab results ready',
        message: 'Your lipid panel review is ready, including the AI range explanation.',
        link: '/patient/lab-results/a5000000-0000-4000-8000-000000000001',
        channels: ['in_app', 'email'],
        isRead: false,
    },
    {
        id: 'a0000000-0000-4000-8000-000000000011',
        userId: DEMO_USER_IDS.patientLina,
        type: 'lab.results.reviewed',
        title: 'Lab results ready',
        message: 'Your COVID-19 antigen lab result is reviewed and ready to view.',
        link: '/patient/lab-results/a5000000-0000-4000-8000-000000000005',
        channels: ['in_app', 'email'],
        isRead: false,
    },
];

const ACTIVITY_ITEMS = [
    {
        id: 'b0000000-0000-4000-8000-000000000001',
        actionType: 'appointment.checked_in',
        description: 'Olivia Brown checked in for a primary care consultation.',
        actorName: 'Ava Miller',
        actorId: DEMO_USER_IDS.receptionist,
        entityType: 'appointment',
        entityId: '20000000-0000-4000-8000-000000000001',
        entityLabel: 'Olivia Brown - General Consultation',
        entityLink: '/admin/appointments/20000000-0000-4000-8000-000000000001',
        facilityId: 'medsphere-demo',
        departmentId: null,
        metadata: { source: 'seed' },
        createdAt: addDays(0),
    },
    {
        id: 'b0000000-0000-4000-8000-000000000002',
        actionType: 'billing.payment_recorded',
        description: 'A card payment was recorded for BILL-DEMO-0001.',
        actorName: 'Ava Miller',
        actorId: DEMO_USER_IDS.receptionist,
        entityType: 'billing',
        entityId: '60000000-0000-4000-8000-000000000001',
        entityLabel: 'BILL-DEMO-0001',
        entityLink: '/admin/billing/60000000-0000-4000-8000-000000000001',
        facilityId: 'medsphere-demo',
        departmentId: null,
        metadata: { amount: 85, source: 'seed' },
        createdAt: addDays(0),
    },
    {
        id: 'b0000000-0000-4000-8000-000000000003',
        actionType: 'inventory.low_stock',
        description: 'Nitrile Gloves - Medium is below its reorder level.',
        actorName: 'MedSphere Inventory',
        actorId: null,
        entityType: 'inventory_item',
        entityId: 'SUP-GLOVE-M',
        entityLabel: 'Nitrile Gloves - Medium',
        entityLink: '/admin/inventory',
        facilityId: 'medsphere-demo',
        departmentId: null,
        metadata: { currentStock: 8, reorderLevel: 40, source: 'seed' },
        createdAt: addDays(-1),
    },
    {
        id: 'b0000000-0000-4000-8000-000000000004',
        actionType: 'lab.result_entered',
        description: 'Kwame Mensah entered a lipid panel and liver function result for Samir Patel.',
        actorName: 'Kwame Mensah',
        actorId: DEMO_USER_IDS.labTechnician,
        entityType: 'lab_order',
        entityId: 'a5000000-0000-4000-8000-000000000001',
        entityLabel: 'Samir Patel - Lipid Panel',
        entityLink: '/lab/orders/a5000000-0000-4000-8000-000000000001',
        facilityId: 'medsphere-demo',
        departmentId: 'LAB',
        metadata: {
            patientName: 'Samir Patel',
            testName: 'Lipid Panel',
            source: 'seed',
        },
        createdAt: addDays(0),
    },
    {
        id: 'b0000000-0000-4000-8000-000000000005',
        actionType: 'lab.results.completed',
        description: 'Critical Troponin I results for Mateo Alvarez were routed to cardiology.',
        actorName: 'Kwame Mensah',
        actorId: DEMO_USER_IDS.labTechnician,
        entityType: 'lab_order',
        entityId: 'a5000000-0000-4000-8000-000000000004',
        entityLabel: 'Mateo Alvarez - Troponin I',
        entityLink: '/doctor/lab-orders/a5000000-0000-4000-8000-000000000004',
        facilityId: 'medsphere-demo',
        departmentId: 'CARD',
        metadata: {
            patientName: 'Mateo Alvarez',
            testName: 'Troponin I',
            severity: 'critical',
            source: 'seed',
        },
        createdAt: addDays(0),
    },
    {
        id: 'b0000000-0000-4000-8000-000000000006',
        actionType: 'lab.results.reviewed',
        description: 'Youssef Benali reviewed Mateo Alvarez Troponin I lab results.',
        actorName: 'Youssef Benali',
        actorId: DEMO_USER_IDS.cardiologist,
        entityType: 'lab_order',
        entityId: 'a5000000-0000-4000-8000-000000000004',
        entityLabel: 'Mateo Alvarez - Troponin I',
        entityLink: '/patient/lab-results/a5000000-0000-4000-8000-000000000004',
        facilityId: 'medsphere-demo',
        departmentId: 'CARD',
        metadata: {
            patientName: 'Mateo Alvarez',
            doctorName: 'Youssef Benali',
            source: 'seed',
        },
        createdAt: addDays(0),
    },
] as const;

function directKey(left: string, right: string) {
    return [left, right].sort().join(':');
}

async function seedNotifications() {
    await prisma.notification.deleteMany({
        where: {
            OR: [
                { id: { in: [...LEGACY_INVALID_UUIDS.notifications] } },
                { userId: { in: [...LEGACY_INVALID_UUIDS.users] } },
            ],
        },
    });

    for (const notification of NOTIFICATIONS) {
        const channels = notification.channels ?? ['in_app'];

        await prisma.notification.upsert({
            where: { id: notification.id },
            update: {
                userId: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                link: notification.link,
                channels,
                isRead: notification.isRead,
                readAt: notification.isRead ? new Date() : null,
            },
            create: {
                ...notification,
                channels,
                readAt: notification.isRead ? new Date() : null,
            },
        });
    }
}

async function seedMongo() {
    if (!process.env.MONGODB_URL) {
        console.log('MONGODB_URL is not configured; skipped Mongo demo seed.');
        return;
    }

    const client = new MongoClient(process.env.MONGODB_URL);
    await client.connect();

    try {
        const db = client.db();
        const existingCollections = new Set(
            (await db.listCollections().toArray()).map((collection) => collection.name),
        );

        for (const collectionName of ['chat_rooms', 'chat_messages', 'activity_streams']) {
            if (!existingCollections.has(collectionName)) {
                await db.createCollection(collectionName);
            }
        }

        const rooms = db.collection('chat_rooms');
        const messages = db.collection('chat_messages');
        const activities = db.collection('activity_streams');

        await Promise.all([
            rooms.deleteMany({ id: { $in: [...LEGACY_INVALID_UUIDS.rooms] } }),
            messages.deleteMany({ id: { $in: [...LEGACY_INVALID_UUIDS.messages] } }),
            activities.deleteMany({ id: { $in: [...LEGACY_INVALID_UUIDS.activities] } }),
        ]);

        await Promise.all([
            rooms.createIndex({ directKey: 1 }, { unique: true, sparse: true }),
            rooms.createIndex({ participants: 1, lastMessageAt: -1 }),
            messages.createIndex({ roomId: 1, createdAt: -1 }),
            messages.createIndex({ roomId: 1, isRead: 1, senderId: 1 }),
            activities.createIndex({ createdAt: -1 }),
            activities.createIndex({ actionType: 1, createdAt: -1 }),
            activities.createIndex({ facilityId: 1, createdAt: -1 }),
        ]);

        const patientDoctorRoomId = 'c0000000-0000-4000-8000-000000000001';
        const patientDoctorParticipants = [DEMO_USER_IDS.patient, DEMO_USER_IDS.doctor].sort();
        const patientMessageTime = addDays(-1);
        const doctorMessageTime = addDays(0);
        const doctorMessage = {
            id: 'c1000000-0000-4000-8000-000000000002',
            roomId: patientDoctorRoomId,
            senderId: DEMO_USER_IDS.doctor,
            content: 'I reviewed your chart. Please bring your inhaler to tomorrow\'s visit.',
            type: 'text',
            fileUrl: null,
            isRead: false,
            readAt: null,
            createdAt: doctorMessageTime,
        };

        await rooms.updateOne(
            { id: patientDoctorRoomId },
            {
                $set: {
                    id: patientDoctorRoomId,
                    directKey: directKey(DEMO_USER_IDS.patient, DEMO_USER_IDS.doctor),
                    participants: patientDoctorParticipants,
                    type: 'direct',
                    lastMessageAt: doctorMessageTime,
                    lastMessage: {
                        id: doctorMessage.id,
                        senderId: doctorMessage.senderId,
                        content: doctorMessage.content,
                        type: doctorMessage.type,
                        fileUrl: null,
                        createdAt: doctorMessage.createdAt,
                    },
                    updatedAt: doctorMessageTime,
                },
                $setOnInsert: {
                    createdAt: patientMessageTime,
                },
            },
            { upsert: true },
        );

        await messages.updateOne(
            { id: 'c1000000-0000-4000-8000-000000000001' },
            {
                $set: {
                    id: 'c1000000-0000-4000-8000-000000000001',
                    roomId: patientDoctorRoomId,
                    senderId: DEMO_USER_IDS.patient,
                    content: 'Hi doctor, should I bring anything for tomorrow?',
                    type: 'text',
                    fileUrl: null,
                    isRead: true,
                    readAt: doctorMessageTime,
                    createdAt: patientMessageTime,
                },
            },
            { upsert: true },
        );

        await messages.updateOne(
            { id: doctorMessage.id },
            { $set: doctorMessage },
            { upsert: true },
        );

        const nurseDoctorRoomId = 'c0000000-0000-4000-8000-000000000002';
        const nurseDoctorMessageTime = addDays(0);
        await rooms.updateOne(
            { id: nurseDoctorRoomId },
            {
                $set: {
                    id: nurseDoctorRoomId,
                    directKey: directKey(DEMO_USER_IDS.nurse, DEMO_USER_IDS.doctor),
                    participants: [DEMO_USER_IDS.nurse, DEMO_USER_IDS.doctor].sort(),
                    type: 'direct',
                    lastMessageAt: nurseDoctorMessageTime,
                    lastMessage: {
                        id: 'c1000000-0000-4000-8000-000000000003',
                        senderId: DEMO_USER_IDS.nurse,
                        content: 'Olivia is checked in and vitals are ready.',
                        type: 'text',
                        fileUrl: null,
                        createdAt: nurseDoctorMessageTime,
                    },
                    updatedAt: nurseDoctorMessageTime,
                },
                $setOnInsert: {
                    createdAt: nurseDoctorMessageTime,
                },
            },
            { upsert: true },
        );

        await messages.updateOne(
            { id: 'c1000000-0000-4000-8000-000000000003' },
            {
                $set: {
                    id: 'c1000000-0000-4000-8000-000000000003',
                    roomId: nurseDoctorRoomId,
                    senderId: DEMO_USER_IDS.nurse,
                    content: 'Olivia is checked in and vitals are ready.',
                    type: 'text',
                    fileUrl: null,
                    isRead: false,
                    readAt: null,
                    createdAt: nurseDoctorMessageTime,
                },
            },
            { upsert: true },
        );

        for (const item of ACTIVITY_ITEMS) {
            await activities.updateOne(
                { id: item.id },
                {
                    $set: item,
                },
                { upsert: true },
            );
        }
    } finally {
        await client.close();
    }
}

async function main() {
    await seedNotifications();
    await seedMongo();

    console.log('Notification service seed complete.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
