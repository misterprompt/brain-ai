# --- Stage 1: Build Frontend (guru-react) ---
FROM node:20.19.0-slim AS frontend-build
WORKDIR /app/frontend

# Copy frontend config
COPY guru-react/package*.json ./
COPY guru-react/tsconfig*.json ./
COPY guru-react/vite.config.ts ./
COPY guru-react/index.html ./
COPY guru-react/tailwind.config.js ./
COPY guru-react/postcss.config.js ./
COPY guru-react/public ./public
COPY guru-react/src ./src

# Install dependencies and build
RUN npm install
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20.19.0-slim AS backend-build
WORKDIR /app

# Copy backend config
COPY package*.json ./
COPY scripts/ ./scripts/
COPY prisma/ ./prisma/
COPY src/ ./src
COPY tsconfig*.json ./

# Install backend dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Build backend (TypeScript -> JavaScript)
RUN npm run build

# --- Stage 3: Production Runtime ---
FROM node:20.19.0-slim AS runtime
WORKDIR /app

# Install runtime dependencies (production only)
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend built files
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/prisma ./prisma
COPY --from=backend-build /app/scripts ./scripts

# Copy frontend built files to public directory
# We assume the server will serve 'public' directory
COPY --from=frontend-build /app/frontend/dist ./public

# Setup Prisma and utilities
RUN npx prisma generate
RUN chmod -R 755 /app/scripts || true

# Install curl for healthcheck
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "dist/server.js"]
