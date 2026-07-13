# Build context is the repository root, not this directory: a workspace app is
# not buildable without packages/* and the root lockfile.
#   docker build -f apps/zalo-worker/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# husky's prepare script wants a .git directory, which no image has.
ENV HUSKY=0
# pnpm asks to confirm a node_modules purge unless it believes it is
# non-interactive.
ENV CI=true
RUN corepack enable

FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm dlx turbo@2 prune zalo-worker --docker

FROM base AS builder
WORKDIR /repo
# Manifests and lockfile first: this layer stays cached until a dependency
# changes, so editing source does not reinstall node_modules.
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=zalo-worker
# Re-resolves node_modules without devDependencies. `pnpm prune --prod` is not
# the tool here: at a workspace root it prunes the root package only, and strips
# every app of its runtime dependencies. Emitted dist/ trees live outside
# node_modules, so they survive.
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /repo .
USER node
# No EXPOSE: the worker has no HTTP listener, it only reaches Redis (spec §3.2).
CMD ["node", "apps/zalo-worker/dist/main"]
