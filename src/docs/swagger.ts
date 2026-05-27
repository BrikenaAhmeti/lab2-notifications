import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'MedSphere Notification Service API',
            version: '1.0.0',
            description: 'Notification service APIs for notifications, Socket.IO events, and MS-52 chat backend.',
        },
        servers: [{ url: 'http://localhost:3005' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                internalApiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-internal-api-key',
                },
            },
            schemas: {
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        type: { type: 'string', example: 'appointment.booked' },
                        title: { type: 'string', example: 'Appointment booked' },
                        message: { type: 'string', example: 'Your appointment has been scheduled.' },
                        link: { type: 'string', nullable: true, example: '/patient/appointments/123' },
                        channels: {
                            type: 'array',
                            items: { type: 'string', enum: ['in_app', 'email'] },
                        },
                        isRead: { type: 'boolean' },
                        readAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                LegacySendNotificationRequest: {
                    type: 'object',
                    required: ['userId', 'type', 'title', 'message'],
                    properties: {
                        userId: { type: 'string', format: 'uuid' },
                        type: { type: 'string', example: 'lab.results.reviewed' },
                        title: { type: 'string', example: 'Lab results ready' },
                        message: { type: 'string', example: 'Your lab results are ready to view.' },
                        link: { type: 'string', nullable: true, example: '/patient/lab-results/123' },
                        channels: {
                            type: 'array',
                            items: { type: 'string', enum: ['in_app', 'email'] },
                            example: ['in_app', 'email'],
                        },
                        recipientEmail: {
                            type: 'string',
                            format: 'email',
                            description: 'Optional recipient email for email-channel delivery.',
                        },
                        dedupeByTypeAndLink: {
                            type: 'boolean',
                            description: 'When true, returns an existing notification for the same user, type, and link instead of creating a duplicate.',
                        },
                    },
                },
                TypedNotificationRecipient: {
                    type: 'object',
                    required: ['role'],
                    properties: {
                        role: {
                            type: 'string',
                            enum: [
                                'patient',
                                'staff',
                                'doctor',
                                'admin',
                                'department_head',
                                'user',
                                'recipient',
                            ],
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Required when the PRD channel includes in-app delivery.',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Required when the PRD channel includes email delivery.',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional recipient-specific app route or absolute URL.',
                        },
                    },
                },
                TypedSendNotificationRequest: {
                    type: 'object',
                    required: ['type', 'recipients'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: [
                                'appointment.booked',
                                'appointment.confirmed',
                                'appointment.reminder.24h',
                                'appointment.reminder.1h',
                                'appointment.cancelled',
                                'appointment.rescheduled',
                                'appointment.no_show',
                                'lab.results.completed',
                                'lab.results.reviewed',
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
                            ],
                        },
                        recipients: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/TypedNotificationRecipient' },
                        },
                        data: {
                            type: 'object',
                            additionalProperties: true,
                            description: 'Event data used by the service template, such as appointmentId, scheduledAt, serviceName, or resetUrl.',
                        },
                        title: {
                            type: 'string',
                            description: 'Optional override for the service-rendered title.',
                        },
                        message: {
                            type: 'string',
                            description: 'Optional override for the service-rendered message.',
                        },
                        link: {
                            type: 'string',
                            nullable: true,
                            description: 'Optional shared app route or absolute URL.',
                        },
                        dedupeByTypeAndLink: {
                            type: 'boolean',
                            description: 'When true, in-app notifications reuse an existing record for the same user, type, and link.',
                        },
                    },
                },
                SendNotificationRequest: {
                    oneOf: [
                        { $ref: '#/components/schemas/TypedSendNotificationRequest' },
                        { $ref: '#/components/schemas/LegacySendNotificationRequest' },
                    ],
                },
                ChatMessage: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        roomId: { type: 'string', format: 'uuid' },
                        senderId: { type: 'string', format: 'uuid' },
                        content: { type: 'string', example: 'See you at 10:00.' },
                        type: { type: 'string', enum: ['text', 'file', 'image'] },
                        fileUrl: { type: 'string', nullable: true, example: '/uploads/chat/result.pdf' },
                        isRead: { type: 'boolean' },
                        readAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                ChatRoom: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        participants: {
                            type: 'array',
                            items: { type: 'string', format: 'uuid' },
                        },
                        type: { type: 'string', enum: ['direct'] },
                        lastMessageAt: { type: 'string', format: 'date-time', nullable: true },
                        lastMessage: {
                            nullable: true,
                            allOf: [{ $ref: '#/components/schemas/ChatMessage' }],
                        },
                        unreadCount: { type: 'integer', minimum: 0 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateDirectChatRoomRequest: {
                    type: 'object',
                    required: ['participantId', 'participantRole'],
                    properties: {
                        participantId: { type: 'string', format: 'uuid' },
                        participantRole: {
                            type: 'string',
                            enum: [
                                'patient',
                                'doctor',
                                'staff',
                                'nurse',
                                'lab_technician',
                                'pharmacist',
                                'receptionist',
                                'admin',
                                'department_head',
                                'super_admin',
                            ],
                        },
                    },
                },
                SendChatMessageRequest: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                        content: { type: 'string', maxLength: 5000 },
                        type: { type: 'string', enum: ['text', 'file', 'image'], default: 'text' },
                        fileUrl: { type: 'string', nullable: true },
                    },
                },
                ChatAttachment: {
                    type: 'object',
                    properties: {
                        fileName: { type: 'string' },
                        fileUrl: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'integer' },
                    },
                },
            },
        },
        paths: {
            '/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check',
                    responses: {
                        200: { description: 'Service is healthy' },
                    },
                },
            },
            '/internal/notifications/send': {
                post: {
                    tags: ['Internal Notifications'],
                    summary: 'Create and emit a notification for a target user',
                    security: [{ internalApiKey: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendNotificationRequest' },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Notification created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            data: { $ref: '#/components/schemas/Notification' },
                                        },
                                    },
                                },
                            },
                        },
                        401: { description: 'Invalid internal API key' },
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
                        },
                        {
                            in: 'query',
                            name: 'page',
                            schema: { type: 'integer', minimum: 1, default: 1 },
                        },
                        {
                            in: 'query',
                            name: 'limit',
                            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                        },
                    ],
                    responses: {
                        200: { description: 'Paginated notifications' },
                        401: { description: 'Missing or invalid JWT' },
                    },
                },
            },
            '/api/notifications/read-all': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark all notifications as read for the authenticated user',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Notifications marked read' },
                    },
                },
            },
            '/api/notifications/{id}/read': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark one notification as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Notification marked read' },
                        404: { description: 'Notification not found' },
                    },
                },
            },
            '/api/notifications/{id}': {
                delete: {
                    tags: ['Notifications'],
                    summary: 'Delete one notification',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        204: { description: 'Notification deleted' },
                        404: { description: 'Notification not found' },
                    },
                },
            },
            '/api/chat/rooms': {
                get: {
                    tags: ['Chat'],
                    summary: 'List chat rooms for the authenticated user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'query',
                            name: 'page',
                            schema: { type: 'integer', minimum: 1, default: 1 },
                        },
                        {
                            in: 'query',
                            name: 'limit',
                            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                        },
                    ],
                    responses: {
                        200: { description: 'Paginated chat rooms with unread counts' },
                        401: { description: 'Missing or invalid JWT' },
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
                                schema: { $ref: '#/components/schemas/CreateDirectChatRoomRequest' },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Direct room ready' },
                        403: { description: 'Chat access denied' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/messages': {
                get: {
                    tags: ['Chat'],
                    summary: 'List paginated room messages, returned newest last',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'roomId',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                        {
                            in: 'query',
                            name: 'page',
                            schema: { type: 'integer', minimum: 1, default: 1 },
                        },
                        {
                            in: 'query',
                            name: 'limit',
                            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                        },
                    ],
                    responses: {
                        200: { description: 'Paginated chat messages' },
                        404: { description: 'Room not found for this user' },
                    },
                },
                post: {
                    tags: ['Chat'],
                    summary: 'Send a text, file, or image message',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'roomId',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendChatMessageRequest' },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Message persisted and emitted with chat:message' },
                        404: { description: 'Room not found for this user' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/read': {
                patch: {
                    tags: ['Chat'],
                    summary: 'Mark all received messages in a room as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'roomId',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Messages marked read and chat:read emitted' },
                        404: { description: 'Room not found for this user' },
                    },
                },
            },
            '/api/chat/rooms/{roomId}/upload': {
                post: {
                    tags: ['Chat'],
                    summary: 'Upload a chat attachment',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'roomId',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                        {
                            in: 'header',
                            name: 'x-file-name',
                            schema: { type: 'string' },
                            description: 'Required for application/octet-stream uploads.',
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/octet-stream': {
                                schema: { type: 'string', format: 'binary' },
                            },
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['fileName', 'contentBase64'],
                                    properties: {
                                        fileName: { type: 'string' },
                                        mimeType: { type: 'string' },
                                        contentBase64: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Attachment stored and URL returned' },
                        404: { description: 'Room not found for this user' },
                    },
                },
            },
        },
    },
    apis: [],
});
