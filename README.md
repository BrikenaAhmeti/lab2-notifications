# MedSphere Notification Service

Notification, realtime, chat, and dashboard activity microservice for Lab2 MedSphere. It owns in-app/email notifications, Socket.IO realtime delivery, chat rooms/messages/read receipts/uploads, dashboard activity ingestion, and appointment reminder jobs.

## Port

- Local and Docker API: `http://localhost:3008`
- Container port: `3008`
- Health: `GET /health`
- REST API base paths: `/api/notifications`, `/api/chat`, `/api/dashboard`
- Socket.IO URL: `http://localhost:3008`

## Data Stores

- PostgreSQL via Prisma for notifications.
- MongoDB for chat rooms, chat messages, and dashboard activity streams.
- Redis for Socket.IO adapter support in multi-instance deployments.

Docker Compose starts Postgres, Redis, MongoDB, a one-time migration container, and the Notification Service.

## Environment Keys

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

Docker/Postgres/Redis/Mongo helper keys:

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

## Swagger

- Swagger UI: `http://localhost:3008/api/docs`
- Legacy Swagger UI alias: `http://localhost:3008/api-docs`
- OpenAPI JSON: `http://localhost:3008/api/docs.json`
- Legacy OpenAPI JSON alias: `http://localhost:3008/api-docs.json`

Set `SWAGGER_ENABLED` to disable Swagger routes when needed.

Swagger covers health, internal notification sends, user notification inbox operations, internal dashboard activity ingestion, dashboard activity reads, chat rooms, chat messages, read receipts, and chat upload.

## Main Routes

- `POST /internal/notifications/send`
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `POST /internal/dashboard/activity`
- `GET /api/dashboard/activity`
- `POST /api/chat/rooms`
- `GET /api/chat/rooms`
- `GET /api/chat/rooms/:roomId/messages`
- `POST /api/chat/rooms/:roomId/messages`
- `PATCH /api/chat/rooms/:roomId/read`
- `POST /api/chat/rooms/:roomId/upload`

## Socket.IO Events

Clients authenticate with an Auth Service JWT. The service emits:

- `notification:new`
- `notification:read`
- `notification:all-read`
- `activity:new`
- `chat:message`
- `chat:read`

## Notes

- `JWT_ACCESS_SECRET` must match the Auth Service access-token secret.
- `INTERNAL_API_KEY` must match Core/Auth/AI where service-to-service calls are enabled.
- SMTP keys are only required for email notification delivery.
