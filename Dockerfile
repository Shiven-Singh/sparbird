# Stage 1: install and build.
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: runtime. Next's standalone output is a plain Node server.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0
# The container's disk does not survive a restart, so history lives in memory and the
# recorded calls are scored once at boot so the page is not empty.
ENV SPARBIRD_EPHEMERAL=1 SPARBIRD_SEED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/personas ./personas
COPY --from=build /app/fixtures ./fixtures
EXPOSE 8080
CMD ["node", "server.js"]
