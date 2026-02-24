# Multi-stage build for Authorio Backend

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy server package files
COPY server/package*.json ./
RUN npm ci

# Copy server source
COPY server/ ./

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start server
CMD ["node", "dist/index.js"]


