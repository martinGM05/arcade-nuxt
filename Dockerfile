FROM node:22.12.0-bookworm-slim AS base
WORKDIR /app

# System deps for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Run
EXPOSE 3000
ENV NITRO_HOST=0.0.0.0
CMD ["sh", "-c", "NITRO_PORT=${PORT:-3000} npx prisma generate && npx prisma migrate deploy && node .output/server/index.mjs"]
