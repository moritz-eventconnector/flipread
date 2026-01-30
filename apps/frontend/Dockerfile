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
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy standalone build
# Next.js 14 with output: 'standalone' creates the entire app in .next/standalone
# including server.js, node_modules, and .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files separately to ensure they're in the right place
# (standalone already includes them, but this ensures compatibility)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Find and run server.js - Next.js 14 standalone creates it in the root of standalone
CMD sh -c 'if [ -f ./server.js ]; then node server.js; elif [ -f ./app/server.js ]; then node ./app/server.js; else echo "ERROR: server.js not found. Directory contents:"; ls -laR . | head -50; exit 1; fi'

