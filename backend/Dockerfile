FROM node:24 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema=prisma/schema

RUN npm run build

# ---------- Production ----------
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package*.json tsconfig*.json ./

RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema && node dist/src/main.js"]