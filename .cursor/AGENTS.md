# AGENTS - BA-Back (NestJS)

Reglas para agentes que trabajan en el backend NestJS.

> **Visión general:** [../../.cursor/AGENTS.md](../../.cursor/AGENTS.md)

## Stack
- NestJS 11, Mongoose, MongoDB
- Passport (JWT, Google OAuth, Local)
- AWS S3, Stripe, LangChain, OpenAI

## Reglas Críticas
- **QuoteStatus:** NO usar `pending`. Solo: draft, sent, approved, rejected, in_progress, completed.
- **RejectionComments:** `comment` obligatorio (mín 10 chars) cuando status es rejected.

## Skills
- `nestjs-mongoose-patterns` — Patrones de módulos, servicios, DTOs
- `quote-approval-flow` — Flujo de estados de cotizaciones
