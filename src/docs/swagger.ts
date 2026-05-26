import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'MedSphere Notification Service API',
            version: '1.0.0',
            description: 'Notification service foundation for MS-14: internal send API, user notification API, and Socket.IO events.',
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
        },
    },
    apis: [],
});
