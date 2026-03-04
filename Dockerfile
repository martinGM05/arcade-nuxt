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
ENV HOST=0.0.0.0
ENV NITRO_HOST=0.0.0.0
CMD ["sh", "-c", "export PORT=${PORT:-3000}; export NITRO_PORT=$PORT; npx prisma generate && npx prisma migrate deploy && node .output/server/index.mjs"]
