# syntax=docker/dockerfile:1

# ---------- build stage ----------
# Build tools are needed because better-sqlite3 is a native module.
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
	&& npm prune --omit=dev

# ---------- runtime stage ----------
# Same base as build → the compiled better-sqlite3 binary stays ABI-compatible.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/royalbeef.db
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# Run pending migrations, seed the library if empty, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node scripts/seed.mjs && node build"]
