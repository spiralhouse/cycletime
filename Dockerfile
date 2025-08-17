# Multi-stage build for optimal size
# Stage 1: Build with JDK
FROM eclipse-temurin:21-jdk AS builder

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

# Stage 2: Runtime image with JRE
FROM eclipse-temurin:21-jre-alpine

# Install required libraries
RUN apk add --no-cache \
    ca-certificates

# Create non-root user
RUN addgroup -g 1000 jcvd && \
    adduser -D -u 1000 -G jcvd jcvd

WORKDIR /app

# Copy the JAR file
COPY --from=builder --chown=jcvd:jcvd /app/build/libs/jcvd-server.jar /app/jcvd-server.jar

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

# Run the JAR file
ENTRYPOINT ["java", "-jar", "/app/jcvd-server.jar"]