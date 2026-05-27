# MedSphere Notification Service

Backend foundation for **MS-14: Notification Service - DB + Socket.IO + Core API**, **MS-52: Chat Backend**, and the **MS-54 admin dashboard activity feed**.

## What This Service Owns

- Dedicated PostgreSQL notifications table
- Internal notification creation API for other MedSphere services
- Authenticated user notification API
- Socket.IO real-time delivery
- Chat rooms, message history, unread counts, read receipts, and attachment URLs
- Admin dashboard recent activity feed backed by MongoDB `activity_streams`
- Optional Redis Socket.IO adapter for multi-instance broadcasting
- Optional MongoDB bootstrap for `chat_rooms`, `chat_messages`, and `activity_streams`
- Optional SMTP email delivery for notifications with the `email` channel
- Swagger/OpenAPI documentation at `/api-docs`

## Stack

- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Socket.IO
- Redis adapter for Socket.IO
- MongoDB driver
- Nodemailer
- Jest
- Zod validation

## Environment

Copy `.env.example` to `.env` and adjust values:

```env
PORT=3005
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medsphere_notifications?schema=public"
MONGODB_URL="mongodb://localhost:27017/medsphere_notifications"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="replace-with-auth-service-access-secret"
INTERNAL_API_KEY="replace-with-shared-internal-service-key"
CORS_ORIGIN="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="smtp-user"
SMTP_PASS="smtp-password"
SMTP_FROM="notifications@medsphere.local"
CHAT_UPLOAD_DIR="uploads/chat"
CHAT_PUBLIC_BASE_URL=""
SWAGGER_ENABLED=true
```

`MONGODB_URL`, `REDIS_URL`, and SMTP values are optional for local development. When `REDIS_URL` is omitted, Socket.IO still works in single-instance mode.

## Run Locally

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Service URLs:

- Health: `GET http://localhost:3005/health`
- Swagger: `http://localhost:3005/api-docs`

## API Surface

Internal service-to-service endpoint:

- `POST /internal/notifications/send`
- Header: `x-internal-api-key: <INTERNAL_API_KEY>`
- Legacy body: `{ userId, type, title, message, link?, channels?, recipientEmail? }`
- MS-31 typed body: `{ type, recipients, data?, title?, message?, link?, dedupeByTypeAndLink? }`

Typed MS-31 payloads derive recipients and channels from PRD 18.1. Example:

```json
{
  "type": "appointment.booked",
  "recipients": [
    {
      "role": "patient",
      "userId": "55f75ac7-b85d-48a4-adba-df4ba1dcba61",
      "email": "patient@example.com"
    },
    {
      "role": "staff",
      "userId": "e54b8b3b-6927-4c67-ad12-61e2e7bf86f0",
      "email": "doctor@example.com"
    }
  ],
  "data": {
    "appointmentId": "appointment-id",
    "serviceName": "Initial Consultation",
    "departmentName": "Cardiology",
    "scheduledAt": "2030-01-02T09:00:00.000Z"
  }
}
```

Authenticated user endpoints:

- `GET /api/notifications?isRead=&page=&limit=` - list my notifications; `isRead=false&page=1&limit=1` returns the unread count in `meta.totalItems` and `meta.unreadCount`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/:id`

Dashboard activity endpoints:

- `GET /api/dashboard/activity?page=1&limit=20` - returns recent facility activity as `{ id, actionType, description, actorName, entityLabel, entityLink, createdAt }`
- `POST /internal/dashboard/activity` - internal-only domain event ingress for activity-only events such as `payment.recorded`

Chat endpoints:

- `POST /api/chat/rooms` - create or reuse a direct room
- `GET /api/chat/rooms?page=&limit=` - list my rooms with unread counts
- `GET /api/chat/rooms/:roomId/messages?page=&limit=` - message history, newest last
- `POST /api/chat/rooms/:roomId/messages` - send text, file, or image message
- `PATCH /api/chat/rooms/:roomId/read` - mark received messages as read
- `POST /api/chat/rooms/:roomId/upload` - upload an attachment by raw bytes with `x-file-name`, or JSON `{ fileName, mimeType, contentBase64 }`

Socket.IO clients connect with:

```ts
io('http://localhost:3005', {
  auth: { token: accessToken },
});
```

Events emitted by the service:

- `notification:new`
- `notification:read`
- `notification:all-read`
- `activity:new`
- `chat:message`
- `chat:read`

## Tests

```bash
npm test
```
