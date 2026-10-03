# syntax=docker/dockerfile:1
# [AUTH-SESSION] Image tidak menyimpan secret auth/OAuth; konfigurasi diberikan saat runtime lewat Compose.
# [AUTH-LOCAL] Seed akun/password demo tidak dijalankan pada build maupun startup image.
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN mkdir -p /app/storage/reports && chown -R node:node /app/storage
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS tooling
COPY --chown=node:node . .
RUN chown node:node /app
USER node

FROM tooling AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM tooling AS builder
ENV NODE_ENV=production
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
