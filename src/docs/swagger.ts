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
                SendNotificationRequest: {
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
        },
    },
    apis: [],
});
