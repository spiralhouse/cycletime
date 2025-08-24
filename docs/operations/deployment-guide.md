# Deployment Guide

## Overview

This guide covers deploying CycleTime to production environments using Docker and Kubernetes.

## Prerequisites

- Docker 20.10+
- Kubernetes 1.25+ (for K8s deployment)
- kubectl configured
- Access to container registry

## Container Deployment

### Using Pre-built Images

```bash
# Pull latest stable version
docker pull ghcr.io/spiralhouse/jcvd:latest

# Pull specific version
docker pull ghcr.io/spiralhouse/jcvd:0.3.0

# Run container
docker run -d \
  --name jcvd \
  -p 8080:8080 \
  -v /data/jcvd:/data \
  -e DATABASE_URL=jdbc:sqlite:/data/cycletime.db \
  -e LOG_LEVEL=INFO \
  ghcr.io/spiralhouse/jcvd:latest
```

### Building Custom Images

```bash
# Clone repository
git clone https://github.com/spiralhouse/jcvd.git
cd jcvd

# Build image
docker build -t cycletime:custom .

# Run custom image
docker run -d --name cycletime -p 8080:8080 cycletime:custom
```

## Kubernetes Deployment

### Basic Deployment

```yaml
# jcvd-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jcvd
  labels:
    app: jcvd
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jcvd
  template:
    metadata:
      labels:
        app: jcvd
    spec:
      containers:
      - name: jcvd
        image: ghcr.io/spiralhouse/jcvd:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: jcvd-secrets
              key: database-url
        - name: LOG_LEVEL
          value: "INFO"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: jcvd-service
spec:
  selector:
    app: jcvd
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace jcvd-prod

# Create secrets
kubectl create secret generic jcvd-secrets \
  --from-literal=database-url=jdbc:sqlite:/data/cycletime.db \
  -n jcvd-prod

# Apply deployment
kubectl apply -f jcvd-deployment.yaml -n jcvd-prod

# Check deployment status
kubectl get pods -n jcvd-prod

# Get service endpoint
kubectl get service jcvd-service -n jcvd-prod
```

## Docker Compose

### Production Stack

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  jcvd:
    image: ghcr.io/spiralhouse/jcvd:latest
    container_name: jcvd-prod
    restart: always
    ports:
      - "80:8080"
    environment:
      - DATABASE_URL=jdbc:sqlite:/data/cycletime.db
      - LOG_LEVEL=INFO
    volumes:
      - jcvd-data:/data
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - jcvd-network

  nginx:
    image: nginx:alpine
    container_name: jcvd-nginx
    restart: always
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - jcvd
    networks:
      - jcvd-network

volumes:
  jcvd-data:
    driver: local

networks:
  jcvd-network:
    driver: bridge
```

### Deploy with Docker Compose

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `jdbc:sqlite:/data/cycletime.db` |
| `PORT` | Server port | `8080` |
| `HOST` | Server host | `0.0.0.0` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_LOGGING` | Enable SQL logging | `false` |
| `MAX_POOL_SIZE` | Database connection pool | `10` |
| `CORS_ENABLED` | Enable CORS | `true` |

## Health Monitoring

### Health Check Endpoint

```bash
curl http://your-server/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "cycletime",
  "version": "0.3.0",
  "dependencies": {
    "database": "connected"
  }
}
```

### Monitoring Setup

1. **Prometheus Metrics** (coming soon)
2. **Application Logs** - Available in `/app/logs`
3. **Container Logs** - Via Docker/Kubernetes

## Backup and Recovery

### Database Backup

```bash
# Backup SQLite database
docker exec cycletime-prod sqlite3 /data/cycletime.db ".backup /data/backup.db"

# Copy backup to host
docker cp cycletime-prod:/data/backup.db ./backups/cycletime-$(date +%Y%m%d).db
```

### Restore from Backup

```bash
# Copy backup to container
docker cp ./backups/cycletime-20250823.db cycletime-prod:/data/restore.db

# Restore database
docker exec cycletime-prod sh -c "mv /data/cycletime.db /data/cycletime.db.old && mv /data/restore.db /data/cycletime.db"

# Restart container
docker restart cycletime-prod
```

## Security Considerations

1. **Use Secrets Management** - Never hardcode credentials
2. **Enable TLS** - Always use HTTPS in production
3. **Network Isolation** - Use private networks
4. **Regular Updates** - Keep images updated
5. **Resource Limits** - Set memory and CPU limits
6. **Log Rotation** - Configure log rotation policies

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs cycletime-prod

# Verify environment variables
docker exec cycletime-prod env

# Test database connection
docker exec cycletime-prod sqlite3 /data/cycletime.db "SELECT 1"
```

### Performance Issues

```bash
# Check resource usage
docker stats cycletime-prod

# Increase resources in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
```

### Database Issues

```bash
# Check database integrity
docker exec cycletime-prod sqlite3 /data/cycletime.db "PRAGMA integrity_check"

# Vacuum database
docker exec cycletime-prod sqlite3 /data/cycletime.db "VACUUM"
```

## Related Documentation

- [Configuration Guide](../getting-started/configuration.md)
- [Environment Management](../ci-cd/environments.md)
- [Monitoring](monitoring.md)
- [Troubleshooting](troubleshooting.md)