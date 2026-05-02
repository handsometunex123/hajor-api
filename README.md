# Hajor Ajo Backend

Scaffolded NestJS backend with Prisma schema and BullMQ queue module for Ajo (rotating savings) system.

Files added:
- `prisma/schema.prisma` - data model
- `src/main.ts` - application entry
- `src/app.module.ts` - root module
- `src/infrastructure/queue/*` - queue module and service
- `.env.example` - environment example

Run locally:

```bash
npm install
# set DATABASE_URL in .env
npx prisma generate
npm run start:dev
```
