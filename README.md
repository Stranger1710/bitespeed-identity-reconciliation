# Bitespeed Backend Task - Identity Reconciliation

## Endpoint
POST /identify

## Request Body
{
  "email": "string",
  "phoneNumber": "string"
}

At least one field is required.

## Setup

1. npm install
2. Add DATABASE_URL in .env
3. npx prisma migrate dev --name init
4. npm run dev

## Tech Stack
- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
