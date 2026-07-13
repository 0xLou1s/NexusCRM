# Build context is the repository root, not this directory: a workspace app is
# not buildable without packages/* and the root lockfile.
#   docker build -f apps/web/Dockerfile .

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
RUN pnpm dlx turbo@2 prune web --docker

FROM base AS builder
WORKDIR /repo
# Manifests and lockfile first: this layer stays cached until a dependency
# changes, so editing source does not reinstall node_modules.
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .

# next.config.ts inlines this into the client bundle as NEXT_PUBLIC_API_URL, so
# it is a build-time input, not a runtime one: an image is bound to the API
# origin it was built against, and it must be the origin the *browser* can
# reach — never a docker-internal hostname.
ARG API_URL=http://localhost:3001
ENV API_URL=$API_URL

RUN pnpm turbo run build --filter=web

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: "standalone"` traces the server and its dependencies into one tree,
# rooted at the workspace (outputFileTracingRoot) so the @workspace/* symlinks
# resolve. Only .next/static and public/ are left to copy by hand.
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
