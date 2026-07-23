# apps/workflows image: workflow-start API and Temporal worker share one
# image with different commands (docs/operations/local_worker.md).
# Build context must be the repository root:
#   docker build -f apps/workflows/Dockerfile -t strengthsync-workflows .
FROM node:22.14.0 AS build
RUN corepack enable
WORKDIR /app

# Install with the full workspace manifest set so the lockfile is honored.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/ui/package.json apps/ui/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/workflows/package.json apps/workflows/package.json
COPY services/domain/package.json services/domain/package.json
COPY services/agent/package.json services/agent/package.json
COPY services/db/package.json services/db/package.json
RUN pnpm install --frozen-lockfile

# Copy only what the workflow runtime needs.
COPY tsconfig.base.json ./
COPY services/domain services/domain
COPY services/agent services/agent
COPY apps/workflows apps/workflows

# Standalone production install of @strengthsync/workflows (+ workspace deps).
# --legacy: pnpm v10+ deploy requires injected workspace packages otherwise.
RUN pnpm deploy --legacy --filter @strengthsync/workflows --prod /prod

FROM node:22.14.0-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod .
# Default process: workflow-start API. The worker uses command override.
CMD ["node_modules/.bin/tsx", "src/api/server.ts"]
