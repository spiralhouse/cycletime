# Multi-stage build for optimal size
# Stage 1: Build with GraalVM
FROM ghcr.io/graalvm/graalvm-community:21 AS builder

# Install native-image tool
RUN gu install native-image

WORKDIR /app

# Copy gradle files
COPY gradle gradle
COPY gradlew gradlew
COPY gradle.properties gradle.properties
COPY settings.gradle.kts settings.gradle.kts
COPY build.gradle.kts build.gradle.kts

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build fat JAR
RUN ./gradlew buildFatJar --no-daemon

# Build native image
RUN native-image \
    -jar build/libs/jcvd-server.jar \
    --no-fallback \
    --enable-http \
    --enable-https \
    -H:+ReportExceptionStackTraces \
    -H:ReflectionConfigurationFiles=src/main/resources/META-INF/native-image/reflect-config.json \
    -H:ResourceConfigurationFiles=src/main/resources/META-INF/native-image/resource-config.json \
    -H:SerializationConfigurationFiles=src/main/resources/META-INF/native-image/serialization-config.json \
    -Os \
    -march=native \
    -o jcvd-server

# Stage 2: Runtime image
FROM alpine:latest

# Install required libraries
RUN apk add --no-cache \
    gcompat \
    libstdc++ \
    ca-certificates

# Create non-root user
RUN addgroup -g 1000 jcvd && \
    adduser -D -u 1000 -G jcvd jcvd

WORKDIR /app

# Copy the native binary
COPY --from=builder --chown=jcvd:jcvd /app/jcvd-server /app/jcvd-server

# Create directory for SQLite database
RUN mkdir -p /app/data && chown -R jcvd:jcvd /app/data

# Switch to non-root user
USER jcvd

# Environment variables
ENV DATABASE_URL="jdbc:sqlite:/app/data/jcvd.db"
ENV PORT=8080
ENV HOST=0.0.0.0

# Expose MCP server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the native binary
ENTRYPOINT ["/app/jcvd-server"]