# Agentic

A private multi-agent workflow application built with Next.js, TypeScript, PostgreSQL, Prisma, Auth.js, OpenAI, and Inngest. Workflows are durable Inngest events, not long-running Vercel route requests. Six specialized agents receive a Zod-validated orchestration plan, store structured results, and contribute to a final Markdown report.

## Local setup

Requirements: Node.js 24, PostgreSQL 15+, an OpenAI API key, and an Inngest account (or the local Inngest dev server).

1. Copy `.env.example` to `.env.local`. Set `DATABASE_URL`, a unique `AUTH_SECRET` (for example, generate one with `openssl rand -base64 32`), and `OPENAI_API_KEY`.
2. Install dependencies and generate the Prisma client: `npm ci` then `npm run db:generate`.
3. Apply migrations: `npm run db:migrate`.
4. Start Next.js with `npm run dev`.
5. Start the Inngest dev server in another terminal with `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest` and open its local dashboard to confirm the app is connected.
6. Open `http://localhost:3000/register` to create the first account.

The workflow API rejects submissions if OpenAI is not configured and reports a worker error if Inngest cannot accept an event. No demo workflows or placeholder metrics are inserted.

## Execution model

- The orchestrator produces one bounded delegation for Research, Analysis, Planning, Technical, Validation, and Synthesis. Zod validates every plan and agent result before it is handed to another step.
- Research runs first; Analysis, Planning, and Technical run in parallel; Validation and Synthesis depend on those outputs. Inngest persists step results and retries failures twice. Each OpenAI call has a 45-second timeout and bounded output tokens.
- A user can have at most two active workflows. The worker runs at most five workflows concurrently. Cancellation is cooperative: it prevents later agent steps but does not terminate a model request already in flight.
- Token counts come from OpenAI usage. Dollar amounts are estimates using the model rates in `src/lib/workflows/openai.ts`; update those rates when provider pricing changes.
- Reports and events are private to the owner. MCP integration is opt-in and default-deny: configure an HTTPS server and comma-separated `MCP_ALLOWED_TOOLS`; only allow-listed tools advertising `readOnlyHint: true` and not `destructiveHint` can be called. Agents do not receive shell, browser, or arbitrary network tools.

## Vercel and Inngest deployment

1. Create a managed PostgreSQL database and configure `DATABASE_URL` in Vercel. Keep connection pooling and provider limits in mind for serverless instances.
2. Connect the GitHub repository to Vercel. Pull requests get preview deployments; merges to the configured production branch deploy through Vercel's Git integration after the GitHub Actions checks pass.
3. Set `AUTH_SECRET`, `AUTH_URL` (the deployed canonical URL), and `OPENAI_API_KEY` as Vercel environment variables. Never add secrets to source control or `NEXT_PUBLIC_*` variables.
4. Create an Inngest app pointing at `https://YOUR_DOMAIN/api/inngest`. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel. Configure Inngest concurrency limits to match or tighten the worker's five-run limit.
5. Run `npm run db:migrate` from a trusted release environment with the production database URL before enabling traffic for a migration. Do not run destructive schema resets against production.
6. Confirm `/api/inngest` is registered in Inngest and that the Vercel deployment has the required environment variables. The Next.js route only enqueues work; Inngest owns retries and durable execution.

Vercel does not provide a PostgreSQL server or a durable background queue. A managed PostgreSQL service and Inngest are required for production. Add a managed rate limiter (for example, at the edge or via a Redis-backed provider) before exposing account creation publicly; the application currently enforces active workflow and model-output limits but does not provide distributed IP-based rate limiting.

## Validation

```sh
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The HTTP smoke suite checks unauthenticated routing and request validation without requiring a live database or OpenAI key. A full authenticated workflow integration run requires configured PostgreSQL, OpenAI, and Inngest services.