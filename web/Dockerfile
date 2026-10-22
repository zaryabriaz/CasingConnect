FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci -w casingconnect-web

FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://casingconnect.com/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://casingconnect.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY web ./web
WORKDIR /app/web
# Cap Node heap so Next build survives ~1GB hosts (with swap).
ENV NODE_OPTIONS=--max-old-space-size=700
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/web ./web
WORKDIR /app/web
EXPOSE 3011
CMD ["npx", "next", "start", "--hostname", "0.0.0.0", "--port", "3011"]
