# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

ARG NODE_IMAGE=node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build
RUN node -e "const fs = require('node:fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); delete pkg.devDependencies; delete pkg.scripts; fs.writeFileSync('package.runtime.json', JSON.stringify(pkg));"

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && rm -f node_modules/.pnpm/lock.yaml

FROM ${NODE_IMAGE} AS runtime
ARG BUILD_DATE=unspecified
ARG VCS_REF=working-tree
ARG VERSION=0.0.1
ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    PORT=3000 \
    TMPDIR=/tmp
LABEL org.opencontainers.image.title="nestjs-backend-starter" \
      org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.version=$VERSION
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.runtime.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
