# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment-specific builds
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_ENV=production
ARG VITE_APP_VERSION=1.0.0

# Build the application
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
