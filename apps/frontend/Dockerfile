FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL

# Set environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copy page-flip library files to public/lib for standalone viewer
# This allows the standalone HTML viewer to load the library locally (no external CDN)
# The prebuild script will handle this, but we also do it here as fallback
RUN mkdir -p ./public/lib && \
    if [ -d ./node_modules/page-flip/dist ]; then \
      if [ -d ./node_modules/page-flip/dist/js ]; then \
        cp -r ./node_modules/page-flip/dist/js/* ./public/lib/; \
      else \
        cp -r ./node_modules/page-flip/dist/* ./public/lib/; \
      fi; \
      echo "Copied page-flip files to public/lib"; \
      ls -la ./public/lib/; \
    else \
      echo "ERROR: page-flip dist directory not found in node_modules"; \
      find ./node_modules -name "page-flip" -type d 2>/dev/null | head -5; \
      exit 1; \
    fi
RUN npm run build
RUN echo "Checking public/lib after build:" && ls -la ./public/lib/ || echo "public/lib directory check failed"

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy page-flip library files from builder's public/lib to public directory
# This allows the standalone HTML viewer to load the library locally (no external CDN)
COPY --from=builder --chown=nextjs:nodejs /app/public/lib ./public/lib

# Copy standalone build
# Next.js 14 with output: 'standalone' creates the entire app in .next/standalone
# including server.js, node_modules, and .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files separately to ensure they're in the right place
# (standalone already includes them, but this ensures compatibility)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

# Find and run server.js
# Next.js 14 standalone creates server.js in different locations depending on app structure
# Try common locations and provide helpful error message if not found
CMD sh -c 'SERVER_FILE=""; \
  if [ -f ./server.js ]; then SERVER_FILE="./server.js"; \
  elif [ -f ./app/server.js ]; then SERVER_FILE="./app/server.js"; \
  elif [ -f ./.next/standalone/server.js ]; then SERVER_FILE="./.next/standalone/server.js"; \
  elif [ -f ./.next/server.js ]; then SERVER_FILE="./.next/server.js"; \
  else \
    echo "ERROR: server.js not found. Searching..."; \
    find . -name "server.js" -type f 2>/dev/null | head -5; \
    echo "Directory structure:"; \
    ls -la; \
    if [ -d .next ]; then echo ".next contents:"; ls -la .next; fi; \
    if [ -d app ]; then echo "app contents:"; ls -la app; fi; \
    exit 1; \
  fi; \
  echo "Starting Next.js server with: $SERVER_FILE"; \
  echo "Environment: PORT=$PORT HOSTNAME=$HOSTNAME NODE_ENV=$NODE_ENV"; \
  exec env PORT=$PORT HOSTNAME=$HOSTNAME NODE_ENV=$NODE_ENV node $SERVER_FILE'

