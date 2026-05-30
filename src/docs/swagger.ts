import swaggerJSDoc from 'swagger-jsdoc';

import { activityDomainEventTypes } from '../modules/dashboard/domain/activity-event-projector';
import {
    chatMessageTypes,
    chatParticipantRoles,
} from '../modules/chat/domain/chat.entity';
import { notificationChannels } from '../modules/notifications/domain/notification.entity';
import {
    notificationEventTypes,
    notificationRecipientRoles,
} from '../modules/notifications/domain/notification-events';

export const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'MedSphere Notification Service API',
            version: '1.0.0',
            description:
                'REST APIs for notifications, MS-52 chat, and MS-54 dashboard activity. Socket.IO clients authenticate with the same JWT and receive notification:new, notification:read, notification:all-read, activity:new, chat:message, and chat:read events.',
        },
        servers: [
            {
                url: 'http://localhost:3005',
                description: 'Local notification service',
            },
        ],
        tags: [
            {
                name: 'Health',
                description: 'Service readiness checks.',
            },
            {
                name: 'Internal Notifications',
                description:
                    'Service-to-service notification ingress secured with x-internal-api-key.',
            },
            {
                name: 'Notifications',
                description: 'Authenticated user notification inbox operations.',
            },
            {
                name: 'Internal Dashboard',
                description:
                    'Service-to-service activity feed ingress secured with x-internal-api-key.',
            },
            {
                name: 'Dashboard',
                description: 'Authenticated admin activity feed reads.',
            },
            {
                name: 'Chat',
                description:
                    'Authenticated chat rooms, message history, read receipts, and attachments.',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'Access token issued by the Auth Service. The user id may be in sub, userId, or id.',
                },
                internalApiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-internal-api-key',
                    description: 'Shared internal service key.',
                },
            },
            parameters: {
                PageParam: {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer', minimum: 1, default: 1 },
                    description: '1-based page number.',
                },
                LimitParam: {
                    in: 'query',
                    name: 'limit',
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    description: 'Items per page.',
                },
                NotificationIdParam: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                    description: 'Notification id.',
                },
                RoomIdParam: {
                    in: 'path',
                    name: 'roomId',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                    description: 'Chat room id.',
                },
                FileNameHeader: {
                    in: 'header',
                    name: 'x-file-name',
                    schema: { type: 'string', minLength: 1, maxLength: 160 },
                    description: 'Required for raw byte attachment uploads.',
                },
            },
            responses: {
                BadRequest: {
                    description: 'Malformed request body.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                malformedJson: {
                                    $ref: '#/components/examples/BadRequestError',
                                },
                            },
                        },
                    },
                },
                Unauthorized: {
                    description: 'Missing or invalid authentication.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                missingBearer: {
                                    $ref: '#/components/examples/UnauthorizedError',
                                },
                            },
                        },
                    },
                },
                Forbidden: {
                    description: 'Authenticated user is not allowed to perform this action.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                denied: {
                                    $ref: '#/components/examples/ForbiddenError',
                                },
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Requested resource was not found.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                notFound: {
                                    $ref: '#/components/examples/NotFoundError',
                                },
                            },
                        },
                    },
                },
                Conflict: {
                    description: 'Request conflicts with an existing resource or state.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                conflict: {
                                    $ref: '#/components/examples/ConflictError',
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation failed.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
                            examples: {
                                validation: {
                                    $ref: '#/components/examples/ValidationError',
                                },
                            },
                        },
                    },
                },
                MongoUnavailable: {
                    description: 'MongoDB is not configured or reachable for this feature.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                mongoUnavailable: {
                                    $ref: '#/components/examples/MongoUnavailableError',
                                },
                            },
                        },
                    },
                },
                InternalServerError: {
                    description: 'Unexpected server error.',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                internalError: {
                                    $ref: '#/components/examples/InternalServerError',
                                },
                            },
                        },
                    },
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: { type: 'string', example: 'Route not found' },
                    },
                },
                ValidationIssue: {
                    type: 'object',
                    required: ['code', 'message', 'path'],
                    properties: {
                        code: { type: 'string', example: 'invalid_type' },
                        message: { type: 'string', example: 'Invalid input' },
                        path: {
                            type: 'array',
                            items: {
                                oneOf: [{ type: 'string' }, { type: 'integer' }],
                            },
                            example: ['recipients', 0, 'email'],
                        },
                    },
                },
                ValidationErrorResponse: {
                    type: 'object',
                    required: ['message', 'issues'],
                    properties: {
                        message: { type: 'string', example: 'Validation failed' },
                        issues: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ValidationIssue' },
                        },
                    },
                },
                HealthResponse: {
                    type: 'object',
                    required: ['status', 'service'],
                    properties: {
                        status: { type: 'string', example: 'ok' },
                        service: { type: 'string', example: 'notification-service' },
                    },
                },
                Notification: {
                    type: 'object',
                    required: [
                        'id',
                        'userId',
                        'type',
                        'title',
                        'message',
                        'link',
                        'channels',
                        'isRead',
                        'readAt',
                        'createdAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        type: { type: 'string', example: 'appointment.booked' },
                        title: { type: 'string', example: 'Appointment booked' },
                        message: {
                            type: 'string',
                            example: 'Initial Consultation in Cardiology has been booked for 2030-01-02 09:00 UTC.',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            example: '/appointments/78a40cf5-51e7-4687-9b8a-62a3a812f4df',
                        },
                        channels: {
                            type: 'array',
                            items: { type: 'string', enum: [...notificationChannels] },
                            example: ['in_app', 'email'],
                        },
                        isRead: { type: 'boolean', example: false },
                        readAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: null,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T10:00:00.000Z',
                        },
                    },
                },
                NotificationResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: { $ref: '#/components/schemas/Notification' },
                    },
                },
                LegacySendNotificationRequest: {
                    type: 'object',
                    required: ['userId', 'type', 'title', 'message'],
                    properties: {
                        userId: { type: 'string', format: 'uuid' },
                        type: { type: 'string', example: 'lab.results.reviewed' },
                        title: { type: 'string', maxLength: 160, example: 'Lab results ready' },
                        message: {
                            type: 'string',
                            maxLength: 2000,
                            example: 'Your lab results are ready to view.',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            example: '/patient/lab-results/2f5cfcb8-9ce3-47f4-b11d-eebc8c3e75a3',
                        },
                        channels: {
                            type: 'array',
                            minItems: 1,
                            items: { type: 'string', enum: [...notificationChannels] },
                            default: ['in_app'],
                            example: ['in_app', 'email'],
                            description:
                                'Must include in_app. Add email when SMTP delivery should also be attempted.',
                        },
                        recipientEmail: {
                            type: 'string',
                            format: 'email',
                            description: 'Optional recipient email for email-channel delivery.',
                            example: 'patient@example.com',
                        },
                        dedupeByTypeAndLink: {
                            type: 'boolean',
                            description:
                                'When true, returns an existing notification for the same user, type, and link instead of creating a duplicate.',
                            example: true,
                        },
                    },
                },
                TypedNotificationRecipient: {
                    type: 'object',
                    required: ['role'],
                    properties: {
                        role: {
                            type: 'string',
                            enum: [...notificationRecipientRoles],
                            example: 'patient',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Required when the event channel includes in-app delivery.',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Required when the event channel includes email delivery.',
                            example: 'patient@example.com',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional recipient-specific app route or absolute URL.',
                            example: '/patient/appointments/78a40cf5-51e7-4687-9b8a-62a3a812f4df',
                        },
                    },
                },
                TypedSendNotificationRequest: {
                    type: 'object',
                    required: ['type', 'recipients'],
                    additionalProperties: false,
                    properties: {
                        type: {
                            type: 'string',
                            enum: [...notificationEventTypes],
                            example: 'appointment.booked',
                        },
                        recipients: {
                            type: 'array',
                            minItems: 1,
                            items: { $ref: '#/components/schemas/TypedNotificationRecipient' },
                            description:
                                'Roles must match the selected notification type. Required userId/email depends on the type channel definitions.',
                        },
                        data: {
                            type: 'object',
                            additionalProperties: true,
                            default: {},
                            description:
                                'Event data used by service templates, such as appointmentId, scheduledAt, serviceName, resetUrl, or inventoryItemId.',
                        },
                        title: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 160,
                            description: 'Optional override for the service-rendered title.',
                        },
                        message: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 2000,
                            description: 'Optional override for the service-rendered message.',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional shared app route or absolute URL.',
                        },
                        dedupeByTypeAndLink: {
                            type: 'boolean',
                            description:
                                'When true, in-app notifications reuse an existing record for the same user, type, and link.',
                            example: true,
                        },
                    },
                },
                SendNotificationRequest: {
                    oneOf: [
                        { $ref: '#/components/schemas/TypedSendNotificationRequest' },
                        { $ref: '#/components/schemas/LegacySendNotificationRequest' },
                    ],
                },
                TypedNotificationResult: {
                    type: 'object',
                    required: ['notifications', 'emailOnlyCount'],
                    properties: {
                        notifications: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Notification' },
                        },
                        emailOnlyCount: {
                            type: 'integer',
                            minimum: 0,
                            description:
                                'Number of recipients that were email-only because the event has no in-app channel.',
                            example: 0,
                        },
                    },
                },
                SendNotificationResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            oneOf: [
                                { $ref: '#/components/schemas/Notification' },
                                { $ref: '#/components/schemas/TypedNotificationResult' },
                            ],
                        },
                    },
                },
                PaginatedNotificationsResponse: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Notification' },
                        },
                        meta: { $ref: '#/components/schemas/NotificationPaginationMeta' },
                    },
                },
                NotificationPaginationMeta: {
                    type: 'object',
                    required: ['page', 'limit', 'totalItems', 'totalPages', 'unreadCount'],
                    properties: {
                        page: { type: 'integer', minimum: 1, example: 1 },
                        limit: { type: 'integer', minimum: 1, example: 20 },
                        totalItems: {
                            type: 'integer',
                            minimum: 0,
                            description:
                                'Total notifications matching the current filters. For isRead=false this is the unread count.',
                            example: 42,
                        },
                        totalPages: { type: 'integer', minimum: 0, example: 3 },
                        unreadCount: {
                            type: 'integer',
                            minimum: 0,
                            description: 'Total unread notifications for the authenticated user.',
                            example: 5,
                        },
                    },
                },
                MarkAllNotificationsReadResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            type: 'object',
                            required: ['count'],
                            properties: {
                                count: {
                                    type: 'integer',
                                    minimum: 0,
                                    description: 'Number of notifications changed to read.',
                                    example: 5,
                                },
                            },
                        },
                    },
                },
                ActivityStreamItem: {
                    type: 'object',
                    required: [
                        'id',
                        'actionType',
                        'description',
                        'actorName',
                        'entityLabel',
                        'entityLink',
                        'createdAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        actionType: { type: 'string', example: 'payment.recorded' },
                        description: {
                            type: 'string',
                            example:
                                'Rita Receptionist recorded a 75.00 EUR payment for Ada Lovelace.',
                        },
                        actorName: { type: 'string', example: 'Rita Receptionist' },
                        entityLabel: { type: 'string', example: 'INV-1001' },
                        entityLink: {
                            type: 'string',
                            nullable: true,
                            example: '/admin/billing/billing-1',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T11:00:00.000Z',
                        },
                    },
                },
                ActivityStreamItemResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: { $ref: '#/components/schemas/ActivityStreamItem' },
                    },
                },
                PaginatedActivityStreamResponse: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ActivityStreamItem' },
                        },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                },
                DomainActivityEventRequest: {
                    type: 'object',
                    required: ['type'],
                    additionalProperties: false,
                    properties: {
                        type: {
                            type: 'string',
                            enum: [...activityDomainEventTypes],
                            example: 'payment.recorded',
                        },
                        data: {
                            type: 'object',
                            additionalProperties: true,
                            default: {},
                            description:
                                'Domain event data. Supports actorName, patientName, entity labels and links, ids, facilityId, departmentId, amount, currency, and activity* display overrides.',
                        },
                        occurredAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Optional event timestamp. Defaults to write time.',
                            example: '2030-01-01T11:00:00.000Z',
                        },
                    },
                },
                ChatMessagePreview: {
                    type: 'object',
                    required: ['id', 'senderId', 'content', 'type', 'fileUrl', 'createdAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        senderId: { type: 'string', format: 'uuid' },
                        content: { type: 'string', example: 'See you at 10:00.' },
                        type: { type: 'string', enum: [...chatMessageTypes], example: 'text' },
                        fileUrl: {
                            type: 'string',
                            nullable: true,
                            example: null,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T12:00:00.000Z',
                        },
                    },
                },
                ChatMessage: {
                    type: 'object',
                    required: [
                        'id',
                        'roomId',
                        'senderId',
                        'content',
                        'type',
                        'fileUrl',
                        'isRead',
                        'readAt',
                        'createdAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        roomId: { type: 'string', format: 'uuid' },
                        senderId: { type: 'string', format: 'uuid' },
                        content: { type: 'string', example: 'See you at 10:00.' },
                        type: { type: 'string', enum: [...chatMessageTypes], example: 'text' },
                        fileUrl: {
                            type: 'string',
                            nullable: true,
                            example: '/uploads/chat/room-id/file.pdf',
                        },
                        isRead: { type: 'boolean', example: false },
                        readAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: null,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T12:00:00.000Z',
                        },
                    },
                },
                ChatMessageResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: { $ref: '#/components/schemas/ChatMessage' },
                    },
                },
                ChatRoom: {
                    type: 'object',
                    required: [
                        'id',
                        'participants',
                        'type',
                        'lastMessageAt',
                        'lastMessage',
                        'createdAt',
                        'updatedAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        participants: {
                            type: 'array',
                            minItems: 2,
                            maxItems: 2,
                            items: { type: 'string', format: 'uuid' },
                        },
                        type: { type: 'string', enum: ['direct'], example: 'direct' },
                        lastMessageAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: null,
                        },
                        lastMessage: {
                            nullable: true,
                            allOf: [{ $ref: '#/components/schemas/ChatMessagePreview' }],
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T12:00:00.000Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2030-01-01T12:00:00.000Z',
                        },
                    },
                },
                ChatRoomSummary: {
                    allOf: [
                        { $ref: '#/components/schemas/ChatRoom' },
                        {
                            type: 'object',
                            required: ['unreadCount'],
                            properties: {
                                unreadCount: { type: 'integer', minimum: 0, example: 2 },
                            },
                        },
                    ],
                },
                ChatRoomResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: { $ref: '#/components/schemas/ChatRoom' },
                    },
                },
                PaginatedChatRoomsResponse: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ChatRoomSummary' },
                        },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                },
                PaginatedChatMessagesResponse: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ChatMessage' },
                            description: 'Messages for the requested page, ordered oldest to newest.',
                        },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                },
                CreateDirectChatRoomRequest: {
                    type: 'object',
                    required: ['participantId', 'participantRole'],
                    additionalProperties: false,
                    properties: {
                        participantId: { type: 'string', format: 'uuid' },
                        participantRole: {
                            type: 'string',
                            enum: [...chatParticipantRoles],
                            example: 'doctor',
                        },
                    },
                },
                SendChatMessageRequest: {
                    type: 'object',
                    required: ['content'],
                    additionalProperties: false,
                    properties: {
                        content: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 5000,
                            example: 'See you at 10:00.',
                        },
                        type: {
                            type: 'string',
                            enum: [...chatMessageTypes],
                            default: 'text',
                            example: 'text',
                        },
                        fileUrl: {
                            type: 'string',
                            nullable: true,
                            description: 'Required when type is file or image.',
                            example: '/uploads/chat/room-id/result.pdf',
                        },
                    },
                },
                MarkChatRoomReadResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            type: 'object',
                            required: ['roomId', 'readCount', 'readAt'],
                            properties: {
                                roomId: { type: 'string', format: 'uuid' },
                                readCount: { type: 'integer', minimum: 0, example: 3 },
                                readAt: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2030-01-01T12:30:00.000Z',
                                },
                            },
                        },
                    },
                },
                ChatAttachmentJsonUploadRequest: {
                    type: 'object',
                    required: ['fileName', 'contentBase64'],
                    additionalProperties: false,
                    properties: {
                        fileName: { type: 'string', minLength: 1, maxLength: 160 },
                        mimeType: { type: 'string', minLength: 1, maxLength: 120 },
                        contentBase64: {
                            type: 'string',
                            minLength: 1,
                            description: 'Base64-encoded file content.',
                        },
                    },
                },
                ChatAttachment: {
                    type: 'object',
                    required: ['fileName', 'fileUrl', 'size'],
                    properties: {
                        fileName: { type: 'string', example: 'result.pdf' },
                        fileUrl: {
                            type: 'string',
                            example: '/uploads/chat/room-id/20300101123000-result.pdf',
                        },
                        mimeType: {
                            type: 'string',
                            nullable: true,
                            example: 'application/pdf',
                        },
                        size: { type: 'integer', minimum: 1, example: 204800 },
                    },
                },
                ChatAttachmentResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: { $ref: '#/components/schemas/ChatAttachment' },
                    },
                },
                PaginationMeta: {
                    type: 'object',
                    required: ['page', 'limit', 'totalItems', 'totalPages'],
                    properties: {
                        page: { type: 'integer', minimum: 1, example: 1 },
                        limit: { type: 'integer', minimum: 1, example: 20 },
                        totalItems: { type: 'integer', minimum: 0, example: 42 },
                        totalPages: { type: 'integer', minimum: 0, example: 3 },
                    },
                },
            },
            examples: {
                LegacySendNotificationRequest: {
                    summary: 'Legacy notification payload',
                    value: {
                        userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                        type: 'lab.results.reviewed',
                        title: 'Lab results ready',
                        message: 'Your lab results are ready to view.',
                        link: '/patient/lab-results/2f5cfcb8-9ce3-47f4-b11d-eebc8c3e75a3',
                        channels: ['in_app', 'email'],
                        recipientEmail: 'patient@example.com',
                        dedupeByTypeAndLink: true,
                    },
                },
                TypedAppointmentBookedRequest: {
                    summary: 'Typed appointment notification',
                    value: {
                        type: 'appointment.booked',
                        recipients: [
                            {
                                role: 'patient',
                                userId: '55f75ac7-b85d-48a4-adba-df4ba1dcba61',
                                email: 'patient@example.com',
                            },
                            {
                                role: 'staff',
                                userId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
                                email: 'doctor@example.com',
                            },
                        ],
                        data: {
                            appointmentId: '78a40cf5-51e7-4687-9b8a-62a3a812f4df',
                            serviceName: 'Initial Consultation',
                            departmentName: 'Cardiology',
                            scheduledAt: '2030-01-02T09:00:00.000Z',
                        },
                        dedupeByTypeAndLink: true,
                    },
                },
                DomainActivityEventRequest: {
                    summary: 'Record payment activity',
                    value: {
                        type: 'payment.recorded',
                        data: {
                            actorName: 'Rita Receptionist',
                            patientName: 'Ada Lovelace',
                            billingId: 'billing-1',
                            invoiceNumber: 'INV-1001',
                            amount: 75,
                            currency: 'EUR',
                            facilityId: 'facility-1',
                        },
                        occurredAt: '2030-01-01T11:00:00.000Z',
                    },
                },
                CreateDirectChatRoomRequest: {
                    summary: 'Create direct room',
                    value: {
                        participantId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
                        participantRole: 'doctor',
                    },
                },
                SendTextChatMessageRequest: {
                    summary: 'Text message',
                    value: {
                        content: 'See you at 10:00.',
                        type: 'text',
                    },
                },
                SendFileChatMessageRequest: {
                    summary: 'File message',
                    value: {
                        content: 'Attached the lab result PDF.',
                        type: 'file',
                        fileUrl: '/uploads/chat/room-id/result.pdf',
                    },
                },
                ChatJsonUploadRequest: {
                    summary: 'JSON attachment upload',
                    value: {
                        fileName: 'result.pdf',
                        mimeType: 'application/pdf',
                        contentBase64: 'JVBERi0xLjQKJcfs...',
                    },
                },
                BadRequestError: {
                    summary: 'Malformed JSON',
                    value: { message: 'Unexpected token } in JSON at position 42' },
                },
                UnauthorizedError: {
                    summary: 'Missing bearer token',
                    value: { message: 'Missing bearer token' },
                },
                ForbiddenError: {
                    summary: 'Chat access denied',
                    value: { message: 'You are not allowed to create this chat room' },
                },
                NotFoundError: {
                    summary: 'Resource missing',
                    value: { message: 'Chat room not found' },
                },
                ConflictError: {
                    summary: 'Conflict',
                    value: { message: 'Resource already exists' },
                },
                ValidationError: {
                    summary: 'Validation failed',
                    value: {
                        message: 'Validation failed',
                        issues: [
                            {
                                code: 'invalid_format',
                                message: 'Invalid email address',
                                path: ['recipients', 0, 'email'],
                            },
                        ],
                    },
                },
                MongoUnavailableError: {
                    summary: 'Mongo unavailable',
                    value: { message: 'MongoDB is not configured for chat' },
                },
                InternalServerError: {
                    summary: 'Unexpected server error',
                    value: { message: 'Internal server error' },
                },
            },
        },
        paths: {
            '/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check',
                    responses: {
                        200: {
                            description: 'Service is healthy.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/HealthResponse' },
                                },
                            },
                        },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/internal/notifications/send': {
                post: {
                    tags: ['Internal Notifications'],
                    summary: 'Create, email, and emit notification events',
                    description:
                        'Accepts the legacy direct payload or the typed event payload used by MedSphere services. Typed events render titles/messages and validate required recipient roles.',
                    security: [{ internalApiKey: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendNotificationRequest' },
                                examples: {
                                    typedAppointmentBooked: {
                                        $ref: '#/components/examples/TypedAppointmentBookedRequest',
                                    },
                                    legacy: {
                                        $ref: '#/components/examples/LegacySendNotificationRequest',
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description:
                                'Notification created or typed notification event processed.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/SendNotificationResponse',
                                    },
                                },
                            },
                        },
                        400: { $ref: '#/components/responses/BadRequest' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/internal/dashboard/activity': {
                post: {
                    tags: ['Internal Dashboard'],
                    summary: 'Record a dashboard activity stream item from a domain event',
                    security: [{ internalApiKey: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/DomainActivityEventRequest',
                                },
                                examples: {
                                    paymentRecorded: {
                                        $ref: '#/components/examples/DomainActivityEventRequest',
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description:
                                'Activity item written to MongoDB and emitted as activity:new.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ActivityStreamItemResponse',
                                    },
                                },
                            },
                        },
                        400: { $ref: '#/components/responses/BadRequest' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/dashboard/activity': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'List recent facility activity for the admin dashboard',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/PageParam' },
                        { $ref: '#/components/parameters/LimitParam' },
                    ],
                    responses: {
                        200: {
                            description:
                                'Paginated activity_streams feed ordered by newest activity first.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/PaginatedActivityStreamResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'List notifications for the authenticated user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'query',
                            name: 'isRead',
                            schema: { type: 'boolean' },
                            description: 'Filter by read state.',
                        },
                        { $ref: '#/components/parameters/PageParam' },
                        { $ref: '#/components/parameters/LimitParam' },
                    ],
                    responses: {
                        200: {
                            description:
                                'Paginated notifications. Use isRead=false&page=1&limit=1 and meta.totalItems or meta.unreadCount for the unread count.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/PaginatedNotificationsResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/notifications/read-all': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark all notifications as read for the authenticated user',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description:
                                'Notifications marked read and notification:all-read emitted.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MarkAllNotificationsReadResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/notifications/{id}/read': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark one notification as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: '#/components/parameters/NotificationIdParam' }],
                    responses: {
                        200: {
                            description:
                                'Notification marked read and notification:read emitted.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/NotificationResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/notifications/{id}': {
                delete: {
                    tags: ['Notifications'],
                    summary: 'Delete one notification',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: '#/components/parameters/NotificationIdParam' }],
                    responses: {
                        204: { description: 'Notification deleted.' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/chat/rooms': {
                get: {
                    tags: ['Chat'],
                    summary: 'List chat rooms for the authenticated user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/PageParam' },
                        { $ref: '#/components/parameters/LimitParam' },
                    ],
                    responses: {
                        200: {
                            description: 'Paginated chat rooms with unread counts.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/PaginatedChatRoomsResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
                post: {
                    tags: ['Chat'],
                    summary: 'Create or find a direct chat room',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateDirectChatRoomRequest',
                                },
                                examples: {
                                    directRoom: {
                                        $ref: '#/components/examples/CreateDirectChatRoomRequest',
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Direct room ready.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ChatRoomResponse' },
                                },
                            },
                        },
                        400: { $ref: '#/components/responses/BadRequest' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/messages': {
                get: {
                    tags: ['Chat'],
                    summary: 'List paginated room messages, returned oldest to newest',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/RoomIdParam' },
                        { $ref: '#/components/parameters/PageParam' },
                        { $ref: '#/components/parameters/LimitParam' },
                    ],
                    responses: {
                        200: {
                            description: 'Paginated chat messages.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/PaginatedChatMessagesResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
                post: {
                    tags: ['Chat'],
                    summary: 'Send a text, file, or image message',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: '#/components/parameters/RoomIdParam' }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendChatMessageRequest' },
                                examples: {
                                    textMessage: {
                                        $ref: '#/components/examples/SendTextChatMessageRequest',
                                    },
                                    fileMessage: {
                                        $ref: '#/components/examples/SendFileChatMessageRequest',
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description:
                                'Message persisted and emitted with chat:message.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ChatMessageResponse',
                                    },
                                },
                            },
                        },
                        400: { $ref: '#/components/responses/BadRequest' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/read': {
                patch: {
                    tags: ['Chat'],
                    summary: 'Mark all received messages in a room as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: '#/components/parameters/RoomIdParam' }],
                    responses: {
                        200: {
                            description:
                                'Messages marked read and chat:read emitted when readCount is greater than zero.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MarkChatRoomReadResponse',
                                    },
                                },
                            },
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/upload': {
                post: {
                    tags: ['Chat'],
                    summary: 'Upload a chat attachment',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/RoomIdParam' },
                        { $ref: '#/components/parameters/FileNameHeader' },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/octet-stream': {
                                schema: { type: 'string', format: 'binary' },
                            },
                            'application/pdf': {
                                schema: { type: 'string', format: 'binary' },
                            },
                            'image/png': {
                                schema: { type: 'string', format: 'binary' },
                            },
                            'image/jpeg': {
                                schema: { type: 'string', format: 'binary' },
                            },
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ChatAttachmentJsonUploadRequest',
                                },
                                examples: {
                                    jsonAttachment: {
                                        $ref: '#/components/examples/ChatJsonUploadRequest',
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Attachment stored and URL returned.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ChatAttachmentResponse',
                                    },
                                },
                            },
                        },
                        400: { $ref: '#/components/responses/BadRequest' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                        422: { $ref: '#/components/responses/ValidationError' },
                        503: { $ref: '#/components/responses/MongoUnavailable' },
                        500: { $ref: '#/components/responses/InternalServerError' },
                    },
                },
            },
        },
    },
    apis: [],
});
