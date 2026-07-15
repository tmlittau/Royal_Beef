# Royal Beef

A web app to run a couch gaming competition night: enter competitors, pick games from a
library, auto-generate a time-feasible tournament per game, track points + stats, and crown
a champion. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full design.

**Stack:** SvelteKit (Svelte 5) · better-sqlite3 + Drizzle ORM · adapter-node · Docker Compose.

## Local development

```bash
npm install
npm run db:generate   # generate SQL migrations from the Drizzle schema
npm run db:migrate    # apply them to ./royalbeef.db
npm run dev           # http://localhost:5173
```

## Production / Docker

```bash
docker compose up --build   # http://localhost:3000
```

The container runs pending migrations on start; the SQLite DB and downloaded cover art
persist on the `royalbeef-data` volume.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` / `npm start` | Production build + run (adapter-node) |
| `npm run db:generate` | Diff schema → new migration in `drizzle/` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Drizzle Studio (browse the DB) |
| `npm run check` | Type-check the project |
