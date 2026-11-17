FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Commit SHA shown in the footer as "Build <sha7>". Pass --build-arg NEXT_PUBLIC_BUILD_SHA=$GITHUB_SHA.
ARG NEXT_PUBLIC_BUILD_SHA
ENV NEXT_PUBLIC_BUILD_SHA=$NEXT_PUBLIC_BUILD_SHA
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# next.config.ts sets `output: "export"`, so `next build` produces a static
# site in ./out and there is no Next.js server to run in production.
# `next start` fails against an export build, so serve the static files
# directly instead.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve@14
COPY --from=builder /app/out ./out
EXPOSE 3000
CMD ["serve", "-l", "3000", "out"]
