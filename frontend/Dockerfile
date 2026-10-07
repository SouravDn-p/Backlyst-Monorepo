FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --force

FROM node:24-alpine AS builder

WORKDIR /app

ARG NODE_ENV
ARG NEXT_TELEMETRY_DISABLED
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}

ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:24-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy standalone server
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]