# ==========================================
# KodetoCareer API — Docker Setup
# Multi-stage build for production optimization
# ==========================================

# Stage 1: Build Image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# Remove development dependencies to keep production image light
RUN npm prune --production

# Stage 2: Production Image
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built code and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 3000

# Start production server
CMD ["node", "dist/index.js"]
