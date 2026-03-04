FROM node:22.12.0-bookworm-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Run
EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node .output/server/index.mjs"]
