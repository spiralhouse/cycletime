# Multi-stage build optimized for artifact caching (SPI-474)
# This Dockerfile is designed to work with pre-built JAR artifacts from CI
# Stage 1: Runtime image with JRE
FROM eclipse-temurin:21-jre-alpine

# Accept version as build argument for labeling and metadata
ARG VERSION=unknown

# Install required libraries
RUN apk add --no-cache \
    ca-certificates

# Create non-root user
RUN addgroup -g 1000 jcvd && \
    adduser -D -u 1000 -G jcvd jcvd

WORKDIR /app

# Copy the pre-built JAR file from CI build artifacts (SPI-474)
# This JAR is downloaded as an artifact from the previous build stage
COPY --chown=jcvd:jcvd build/libs/jcvd-server.jar /app/jcvd-server.jar

# Create directory for SQLite database
RUN mkdir -p /app/data && chown -R jcvd:jcvd /app/data

# Switch to non-root user
USER jcvd

# Labels for metadata and versioning
LABEL org.opencontainers.image.title="JCVD Server"
LABEL org.opencontainers.image.description="JCVD project orchestration framework MCP server"
LABEL org.opencontainers.image.version="$VERSION"
LABEL org.opencontainers.image.vendor="Spiral House"
LABEL org.opencontainers.image.source="https://github.com/spiralhouse/jcvd"

# Environment variables
ENV DATABASE_URL="jdbc:sqlite:/app/data/jcvd.db"
ENV PORT=8080
ENV HOST=0.0.0.0
ENV JCVD_VERSION="$VERSION"

# Expose MCP server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the JAR file
ENTRYPOINT ["java", "-jar", "/app/jcvd-server.jar"]