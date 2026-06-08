# MedSphere Notification Service

Notification, realtime, chat, and dashboard activity microservice for Lab2 MedSphere. It owns in-app/email notifications, Socket.IO realtime delivery, chat rooms/messages/read receipts/uploads, dashboard activity ingestion, and appointment reminder jobs.

## Port

- Local and Docker API: `http://localhost:3008`
- Container port: `3008`
- Health: `GET /health`
- REST API base paths: `/api/notifications`, `/api/chat`, `/api/dashboard`
- Internal API base paths: `/internal/notifications`, `/internal/dashboard`
- Chat upload static path: `/uploads/chat`
- Socket.IO URL: `http://localhost:3008`
- Swagger UI: `http://localhost:3008/api/docs`
- Legacy Swagger UI alias: `http://localhost:3008/api-docs`
- OpenAPI JSON: `http://localhost:3008/api/docs.json`
- Legacy OpenAPI JSON alias: `http://localhost:3008/api-docs.json`

Set `SWAGGER_ENABLED=false` to disable Swagger routes.

## Data Stores

- PostgreSQL via Prisma for notification inbox records and channel deliveries.
- MongoDB for chat rooms, chat messages, and dashboard activity streams.
- Redis for the Socket.IO adapter in multi-instance deployments.

Docker Compose starts Postgres, Redis, MongoDB, a one-time Prisma migration container, and the Notification Service.

Owned PostgreSQL tables:

- `notifications`
- `notification_channels`

Owned MongoDB collections:

- `chat_rooms`
- `chat_messages`
- `activity_streams`

## Environment

Copy `.env.example` to `.env`.

Service keys:

- `NODE_ENV`
- `PORT`
- `JWT_ACCESS_SECRET`
- `INTERNAL_API_KEY`
- `CORS_ORIGIN`
- `SWAGGER_ENABLED`
- `DATABASE_URL`
- `REDIS_URL`
- `MONGODB_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `AUTH_SERVICE_URL`
- `CORE_SERVICE_URL`
- `CHAT_UPLOAD_DIR`
- `CHAT_PUBLIC_BASE_URL`
- `APPOINTMENT_REMINDER_JOB_ENABLED`

Docker and datastore helper keys:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `REDIS_PASSWORD`
- `REDIS_PORT`
- `MONGO_ROOT_USERNAME`
- `MONGO_ROOT_PASSWORD`
- `MONGO_DATABASE`
- `MONGO_PORT`
- `AUTH_SERVICE_URL_DOCKER`
- `CORE_SERVICE_URL_DOCKER`
- `NOTIFICATION_SERVICE_PORT`

`JWT_ACCESS_SECRET` must match the Auth Service access-token secret. `INTERNAL_API_KEY` must match Core/Auth/AI for service-to-service routes.

## Start Locally

```bash
npm install
cp .env.example .env
npm run docker:infra
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Stop only local infrastructure:

```bash
npm run docker:infra:down
```

## Run With Docker

```bash
cp .env.example .env
npm run docker:up
```

Stop the stack:

```bash
npm run docker:down
```

Docker starts Postgres, Redis, MongoDB, runs `prisma migrate deploy`, then starts the Notification Service.

## Build And Tests

```bash
npm run build
npm run test
```

Additional commands:

```bash
npm run test:watch
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
```

## Main Routes

Notifications:

- `POST /internal/notifications/send`
- `GET /api/notifications`
- `PUT /api/notifications/read-all`
- `PUT /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

Dashboard activity:

- `POST /internal/dashboard/activity`
- `GET /api/dashboard/activity`

Chat:

- `POST /api/chat/rooms`
- `GET /api/chat/rooms`
- `GET /api/chat/rooms/:roomId/messages`
- `POST /api/chat/rooms/:roomId/messages`
- `PATCH /api/chat/rooms/:roomId/read`
- `POST /api/chat/rooms/:roomId/upload`

Swagger is the source of truth for request and response shapes.

## Socket.IO Events

Clients authenticate with an Auth Service JWT. The service emits:

- `notification:new`
- `notification:read`
- `notification:all-read`
- `activity:new`
- `chat:message`
- `chat:read`

Redis adapter support is enabled when Redis is configured.

## Integrations

- Core sends appointment, billing, lab, pharmacy, inventory, feedback, and contact notifications through internal routes.
- Auth verifies JWTs and provides user profile labels for chat participants.
- Email delivery uses SMTP settings when email notifications are requested.
- Appointment reminder jobs query Core when `APPOINTMENT_REMINDER_JOB_ENABLED=true`.

## Database Normalization

The Prisma schema is normalized to 3NF for notification inbox data:

- `Notification` stores the notification header/body and user delivery state.
- `NotificationChannelDelivery` stores one row per channel with a composite key, avoiding repeated channel columns on the notification row.

MongoDB is used for chat and activity document streams:

- `chat_rooms` stores room membership and a last-message preview for inbox performance.
- `chat_messages` stores the source messages and read state.
- `activity_streams` stores append-only activity events for dashboards.

The `lastMessage` field on chat rooms is an intentional read-model snapshot; `chat_messages` remains the source for message history.

## Notes

- SMTP keys are only required for email notification delivery.
- Chat uploads are stored under `CHAT_UPLOAD_DIR` and exposed through `/uploads/chat`.
