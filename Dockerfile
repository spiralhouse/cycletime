# Multi-stage build for optimal size and caching (SPI-475)
# Stage 1: Build with JDK
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Install required tools for better caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy gradle wrapper and properties first (changes least frequently)
COPY gradlew gradlew
COPY gradle.properties gradle.properties
COPY gradle/ gradle/

# Make gradlew executable
RUN chmod +x gradlew

# Copy only dependency-related files first for better layer caching
COPY settings.gradle.kts settings.gradle.kts
COPY gradle/libs.versions.toml gradle/libs.versions.toml
COPY build.gradle.kts build.gradle.kts

# Download and cache dependencies (this layer will be cached unless dependencies change)
RUN ./gradlew dependencies --no-daemon --build-cache

# Copy CI-optimized properties for build
COPY .github/gradle-ci.properties gradle.properties

# Copy source code (changes most frequently, so placed last)
COPY src/ src/

# Build fat JAR with comprehensive caching
RUN ./gradlew buildFatJar --no-daemon --build-cache --configuration-cache

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