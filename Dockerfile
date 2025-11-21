# AllInOne Telegram Bot - Dockerfile
FROM denoland/deno:alpine-2.5.6

# Install dependencies for PostgreSQL client
RUN apk add --no-cache postgresql-client curl

# Set working directory
WORKDIR /app

# Copy deno.json and deno.lock first for better caching
COPY deno.json deno.lock* ./

# Copy source code
COPY src ./src

# Cache Deno dependencies with all necessary permissions
RUN deno cache --allow-import src/main.ts

# Expose port for games server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "Deno.exit(0)" || exit 1

# Start the bot with production command
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-import", "src/main.ts"]
