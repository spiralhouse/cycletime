---
title: "CycleTime Observability Guide"
type: guide
domain: [operations, observability]
description: "Complete guide to observability features in CycleTime CE"
dependencies: []
related: []
keywords: [observability, logging, metrics, monitoring, health checks, prometheus, loki, grafana]
estimated_time: 15 minutes
difficulty: intermediate
last_updated: 2025-12-03
---

# CycleTime Observability Guide

## Introduction

CycleTime CE provides comprehensive observability features designed for production deployment while remaining lightweight enough for local development. The system offers three core capabilities:

1. **Structured JSON Logging** - Machine-parseable logs with correlation IDs and MCP context
2. **Metrics Collection** - Prometheus-compatible metrics for JVM, HTTP, and application-specific measurements
3. **Health Checks** - Component-level health monitoring with degradation detection

### Local-First Design

All observability features work standalone on developer laptops without external dependencies. You can:

- View plain text logs during development
- Access metrics via HTTP endpoints
- Check health status with curl

### Optional Stack Integration

For production deployments, CycleTime integrates seamlessly with industry-standard observability tools:

- **Prometheus** - Metrics collection and alerting
- **Loki** - Log aggregation and querying
- **Grafana** - Unified visualization dashboards

## Structured JSON Logging

### Enabling Production Logging

CycleTime uses different log configurations for development and production:

**Development (default)**: Plain text logs to console for easy reading
**Production**: Structured JSON logs for machine processing

Enable JSON logging by setting the `LOGBACK_CONFIGURATION_FILE` environment variable:

```bash
export LOGBACK_CONFIGURATION_FILE=logback-prod.xml
```

Or in Docker:

```yaml
environment:
  LOGBACK_CONFIGURATION_FILE: logback-prod.xml
```

### Log Format and Fields

Production logs use JSON structure with the following fields:

```json
{
  "@timestamp": "2025-12-03T10:15:30.123Z",
  "message": "Tool invocation completed",
  "logger": "io.spiralhouse.cycletime.mcp.MCPLogger",
  "level": "INFO",
  "thread": "DefaultDispatcher-worker-1",
  "mdc": {
    "request-id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mcp-session-id": "session-abc123",
    "mcp-tool": "project_create_project",
    "mcp-request-id": "req-xyz789"
  }
}
```

**Standard Fields:**
- `@timestamp` - ISO 8601 timestamp with millisecond precision
- `message` - Human-readable log message
- `logger` - Fully qualified logger name
- `level` - Log level (TRACE, DEBUG, INFO, WARN, ERROR)
- `thread` - Thread name where log event occurred

**MDC Context Fields:**
- `request-id` - Correlation ID for HTTP requests (automatically generated)
- `mcp-session-id` - MCP session identifier
- `mcp-tool` - Name of invoked MCP tool
- `mcp-request-id` - MCP protocol request ID

### Correlation IDs

CycleTime automatically adds correlation IDs to all HTTP requests using the Ktor `CallId` plugin. The `request-id` field in MDC allows tracing a request across multiple log entries:

```json
{"@timestamp":"2025-12-03T10:15:30.100Z","message":"Incoming request","mdc":{"request-id":"a1b2c3d4"}}
{"@timestamp":"2025-12-03T10:15:30.150Z","message":"Database query","mdc":{"request-id":"a1b2c3d4"}}
{"@timestamp":"2025-12-03T10:15:30.200Z","message":"Request completed","mdc":{"request-id":"a1b2c3d4"}}
```

### MCP Context Fields

The `MCPLogger` utility enriches logs with MCP protocol context:

```kotlin
// Automatically adds mcp-session-id, mcp-tool, mcp-request-id to MDC
MCPLogger.logToolInvocation("project_create_project", sessionId, requestId)
```

Example log output with MCP context:

```json
{
  "@timestamp": "2025-12-03T10:15:30.123Z",
  "message": "Tool invocation: project_create_project",
  "level": "INFO",
  "mdc": {
    "request-id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mcp-session-id": "session-abc123",
    "mcp-tool": "project_create_project",
    "mcp-request-id": "req-xyz789"
  }
}
```

### Viewing Logs

**Development (console):**
```bash
./gradlew run
# Logs appear as plain text in terminal
```

**Production (Docker):**
```bash
# View live logs
docker logs -f cycletime-ce

# View with timestamps
docker logs -t cycletime-ce

# Tail last 100 lines
docker logs --tail 100 cycletime-ce
```

**Production (file):**
```bash
# Log file location (configured in logback-prod.xml)
tail -f logs/cycletime.json

# Parse with jq for readability
tail -f logs/cycletime.json | jq '.'
```

### Example Log Output

Development (plain text):
```
2025-12-03 10:15:30.123 INFO  [ktor-request] Tool invocation: project_create_project
2025-12-03 10:15:30.456 INFO  [ktor-request] Database query executed in 15ms
```

Production (JSON):
```json
{
  "@timestamp": "2025-12-03T10:15:30.123Z",
  "message": "Tool invocation: project_create_project",
  "logger": "io.spiralhouse.cycletime.mcp.MCPLogger",
  "level": "INFO",
  "thread": "ktor-request",
  "mdc": {
    "request-id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mcp-session-id": "session-abc123",
    "mcp-tool": "project_create_project"
  }
}
```

## Metrics Collection

### Accessing the Metrics Endpoint

CycleTime exposes Prometheus-compatible metrics at the `/metrics` endpoint:

```bash
curl http://localhost:8080/metrics
```

The endpoint returns metrics in Prometheus text format, suitable for scraping by Prometheus or viewing in browsers.

### Prometheus Format

Metrics follow the Prometheus exposition format with four components:

```
# HELP metric_name Description of what this metric measures
# TYPE metric_name counter
metric_name{label="value"} 42.0
```

**Components:**
- `HELP` - Human-readable description
- `TYPE` - Metric type (counter, gauge, histogram, summary)
- Labels - Key-value pairs for dimensionality (e.g., `{tool="project_create_project"}`)
- Value - Numeric measurement

### Available Metrics

#### JVM Metrics

**Memory Usage:**
```
jvm_memory_used_bytes{area="heap",id="G1 Old Gen"} 1.2345678e+07
jvm_memory_used_bytes{area="nonheap",id="Metaspace"} 5.678901e+06
jvm_memory_max_bytes{area="heap",id="G1 Old Gen"} 1.073741824e+09
```

**Garbage Collection:**
```
jvm_gc_pause_seconds_count{action="end of minor GC",cause="G1 Evacuation Pause"} 15
jvm_gc_pause_seconds_sum{action="end of minor GC",cause="G1 Evacuation Pause"} 0.123
jvm_gc_memory_allocated_bytes_total 1.234567e+08
```

**Thread Metrics:**
```
jvm_threads_live_threads 25
jvm_threads_daemon_threads 10
jvm_threads_peak_threads 30
jvm_threads_states_threads{state="runnable"} 8
jvm_threads_states_threads{state="waiting"} 12
```

**Processor Metrics:**
```
process_cpu_usage 0.15
system_cpu_count 8
```

#### HTTP Metrics

Ktor automatically instruments HTTP requests:

```
ktor_http_server_requests_seconds_count{method="POST",route="/mcp/v1",status="200"} 42
ktor_http_server_requests_seconds_sum{method="POST",route="/mcp/v1",status="200"} 1.234
ktor_http_server_requests_active 3
```

#### CycleTime Custom Metrics

**MCP Tool Invocations (Counter):**
```
# HELP cycletime_mcp_tool_invocations_total Total number of MCP tool invocations
# TYPE cycletime_mcp_tool_invocations_total counter
cycletime_mcp_tool_invocations_total{tool="project_create_project",status="success"} 42.0
cycletime_mcp_tool_invocations_total{tool="project_list_projects",status="success"} 128.0
cycletime_mcp_tool_invocations_total{tool="issue_create_issue",status="error"} 3.0
```

**MCP Tool Duration (Timer/Histogram):**
```
# HELP cycletime_mcp_tool_duration_seconds Duration of MCP tool invocations
# TYPE cycletime_mcp_tool_duration_seconds histogram
cycletime_mcp_tool_duration_seconds_count{tool="project_create_project"} 42.0
cycletime_mcp_tool_duration_seconds_sum{tool="project_create_project"} 2.1
cycletime_mcp_tool_duration_seconds_bucket{tool="project_create_project",le="0.1"} 30.0
cycletime_mcp_tool_duration_seconds_bucket{tool="project_create_project",le="0.5"} 40.0
cycletime_mcp_tool_duration_seconds_bucket{tool="project_create_project",le="+Inf"} 42.0
```

**MCP Active Sessions (Gauge):**
```
# HELP cycletime_mcp_active_sessions Number of active MCP sessions
# TYPE cycletime_mcp_active_sessions gauge
cycletime_mcp_active_sessions 5.0
```

**MCP Tool Errors (Counter):**
```
# HELP cycletime_mcp_tool_errors_total Total number of MCP tool errors
# TYPE cycletime_mcp_tool_errors_total counter
cycletime_mcp_tool_errors_total{tool="project_create_project",error_type="ValidationError"} 2.0
cycletime_mcp_tool_errors_total{tool="issue_update_issue",error_type="NotFoundException"} 1.0
```

**Database Connection Pool (Gauges):**
```
# HELP cycletime_db_connections_active Active database connections
# TYPE cycletime_db_connections_active gauge
cycletime_db_connections_active 3.0

# HELP cycletime_db_connections_idle Idle database connections
# TYPE cycletime_db_connections_idle gauge
cycletime_db_connections_idle 7.0

# HELP cycletime_db_connections_max Maximum database connections
# TYPE cycletime_db_connections_max gauge
cycletime_db_connections_max 10.0
```

**Database Query Duration (Timer/Histogram):**
```
# HELP cycletime_db_query_duration_seconds Duration of database queries
# TYPE cycletime_db_query_duration_seconds histogram
cycletime_db_query_duration_seconds_count{query="project_list"} 128.0
cycletime_db_query_duration_seconds_sum{query="project_list"} 1.92
cycletime_db_query_duration_seconds_bucket{query="project_list",le="0.01"} 100.0
cycletime_db_query_duration_seconds_bucket{query="project_list",le="0.05"} 125.0
cycletime_db_query_duration_seconds_bucket{query="project_list",le="+Inf"} 128.0
```

### Example Metrics Output

```
# HELP jvm_memory_used_bytes The amount of used memory
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",id="G1 Eden Space"} 1.048576e+07
jvm_memory_used_bytes{area="heap",id="G1 Old Gen"} 2.097152e+07

# HELP cycletime_mcp_tool_invocations_total Total number of MCP tool invocations
# TYPE cycletime_mcp_tool_invocations_total counter
cycletime_mcp_tool_invocations_total{tool="project_create_project",status="success"} 42.0
cycletime_mcp_tool_invocations_total{tool="project_list_projects",status="success"} 128.0

# HELP cycletime_db_connections_active Active database connections
# TYPE cycletime_db_connections_active gauge
cycletime_db_connections_active 3.0
```

### Disabling Metrics

Metrics collection is enabled by default. Disable it by setting the `METRICS_ENABLED` environment variable:

```bash
export METRICS_ENABLED=false
```

Or in Docker:

```yaml
environment:
  METRICS_ENABLED: false
```

When disabled:
- The `/metrics` endpoint returns 404 Not Found
- No metrics are collected (zero performance overhead)
- Memory usage reduces slightly (no Micrometer registry)

## Health Checks

### Accessing the Health Endpoint

CycleTime provides component-level health monitoring at the `/health` endpoint:

```bash
curl http://localhost:8080/health
```

The endpoint returns JSON with overall status and component-level details.

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T10:15:30.123Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "memory": {
      "status": "healthy",
      "usedPercent": 45.2,
      "used": "512MB",
      "max": "1024MB"
    },
    "mcp": {
      "status": "healthy",
      "activeSessions": 3
    }
  }
}
```

### Component Checks

#### Database Check

Validates database connectivity by executing a simple query:

```json
{
  "database": {
    "status": "healthy",
    "responseTime": "5ms"
  }
}
```

**Failure scenarios:**
- Connection timeout: `"status": "unhealthy", "error": "Connection timeout"`
- Query failure: `"status": "unhealthy", "error": "Query execution failed"`

#### Memory Check

Monitors JVM heap memory usage with degradation detection:

```json
{
  "memory": {
    "status": "degraded",
    "usedPercent": 82.5,
    "used": "825MB",
    "max": "1024MB",
    "warning": "Memory usage above 80% threshold"
  }
}
```

**Thresholds:**
- `healthy`: < 80% heap usage
- `degraded`: 80-90% heap usage (warning logged)
- `unhealthy`: > 90% heap usage (alert logged)

#### MCP Check

Reports MCP session activity:

```json
{
  "mcp": {
    "status": "healthy",
    "activeSessions": 5
  }
}
```

### Health Status Levels

CycleTime uses three health status levels:

1. **healthy** - All components operating normally
2. **degraded** - System operational but performance/capacity concerns exist
3. **unhealthy** - Critical component failure requiring immediate attention

**Overall status determination:**
- If ANY component is `unhealthy` → Overall status is `unhealthy`
- If ANY component is `degraded` (and none unhealthy) → Overall status is `degraded`
- If ALL components are `healthy` → Overall status is `healthy`

### HTTP Status Codes

The `/health` endpoint returns different HTTP status codes based on overall health:

- **200 OK** - System is `healthy` or `degraded`
- **503 Service Unavailable** - System is `unhealthy`

This allows load balancers and orchestration platforms to automatically remove unhealthy instances from rotation.

**Example with curl:**
```bash
# Healthy system
curl -i http://localhost:8080/health
# HTTP/1.1 200 OK

# Unhealthy system
curl -i http://localhost:8080/health
# HTTP/1.1 503 Service Unavailable
```

### Example Health Responses

**Healthy System:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T10:15:30.123Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "memory": {
      "status": "healthy",
      "usedPercent": 45.2,
      "used": "512MB",
      "max": "1024MB"
    },
    "mcp": {
      "status": "healthy",
      "activeSessions": 3
    }
  }
}
```

**Degraded System (High Memory):**
```json
{
  "status": "degraded",
  "timestamp": "2025-12-03T10:15:30.123Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "memory": {
      "status": "degraded",
      "usedPercent": 85.7,
      "used": "858MB",
      "max": "1024MB",
      "warning": "Memory usage above 80% threshold"
    },
    "mcp": {
      "status": "healthy",
      "activeSessions": 3
    }
  }
}
```

**Unhealthy System (Database Failure):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-03T10:15:30.123Z",
  "components": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout after 5000ms"
    },
    "memory": {
      "status": "healthy",
      "usedPercent": 45.2,
      "used": "512MB",
      "max": "1024MB"
    },
    "mcp": {
      "status": "healthy",
      "activeSessions": 3
    }
  }
}
```

## Integration with Observability Stack

### Prometheus Scraping Configuration

Add CycleTime as a scrape target in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'cycletime'
    scrape_interval: 15s
    static_configs:
      - targets: ['cycletime:8080']
    metrics_path: '/metrics'
```

**Configuration options:**
- `scrape_interval` - How often to collect metrics (recommended: 15s for production)
- `scrape_timeout` - Maximum time for scrape operation (default: 10s)
- `metrics_path` - Endpoint path (always `/metrics` for CycleTime)

**Service discovery (Kubernetes):**
```yaml
scrape_configs:
  - job_name: 'cycletime'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: cycletime
```

### Loki Log Shipping

Configure Docker to ship JSON logs to Loki using the Docker log driver:

**Docker Compose with Loki:**
```yaml
services:
  cycletime:
    image: cycletime-ce:latest
    environment:
      LOGBACK_CONFIGURATION_FILE: logback-prod.xml
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "5"
        loki-max-backoff: "800ms"
        labels: "app=cycletime,environment=production"
```

**Loki configuration for JSON parsing:**
```yaml
# loki-config.yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

# Parse JSON logs
pipeline_stages:
  - json:
      expressions:
        timestamp: "@timestamp"
        level: level
        message: message
        logger: logger
  - timestamp:
      source: timestamp
      format: RFC3339
  - labels:
      level:
      logger:
```

**Querying logs in Loki:**
```
{app="cycletime"} | json | level="ERROR"
{app="cycletime"} | json | mdc_mcp_tool="project_create_project"
{app="cycletime"} | json | mdc_request_id="a1b2c3d4"
```

### Grafana Dashboard Setup

Grafana provides unified visualization for metrics and logs:

**Data Sources:**
1. Add Prometheus data source: `http://prometheus:9090`
2. Add Loki data source: `http://loki:3100`

**Dashboard panels:**
- **MCP Tool Invocations**: `rate(cycletime_mcp_tool_invocations_total[5m])`
- **MCP Tool Duration (p95)**: `histogram_quantile(0.95, cycletime_mcp_tool_duration_seconds)`
- **Database Connections**: `cycletime_db_connections_active`
- **JVM Memory Usage**: `jvm_memory_used_bytes / jvm_memory_max_bytes * 100`
- **Error Rate**: `rate(cycletime_mcp_tool_errors_total[5m])`

**Log exploration:**
- Filter by correlation ID to trace requests
- Search by MCP tool name for tool-specific logs
- Alert on error log patterns

### Environment Variables for Production

Complete production configuration:

```bash
# Logging
LOGBACK_CONFIGURATION_FILE=logback-prod.xml

# Metrics
METRICS_ENABLED=true

# Application
KTOR_ENV=production
KTOR_PORT=8080

# Database
DATABASE_PATH=/data/cycletime-ce.db
```

**Docker Compose example:**
```yaml
version: '3.8'

services:
  cycletime:
    image: cycletime-ce:latest
    environment:
      LOGBACK_CONFIGURATION_FILE: logback-prod.xml
      METRICS_ENABLED: "true"
      KTOR_ENV: production
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        labels: "app=cycletime"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

## Local Development

### Default Behavior

During local development, CycleTime uses development-friendly defaults:

**Logging:**
- Plain text format to console
- Human-readable timestamps
- Color-coded log levels (if terminal supports)
- No JSON overhead

**Metrics:**
- Enabled by default
- Accessible at `http://localhost:8080/metrics`
- Minimal performance impact

**Health Checks:**
- Always available at `http://localhost:8080/health`
- Reports actual component status

### Viewing Logs in Console

Start CycleTime and view logs in real-time:

```bash
./gradlew run

# Output:
2025-12-03 10:15:30.123 INFO  [main] Application starting...
2025-12-03 10:15:30.456 INFO  [main] Database connection established
2025-12-03 10:15:30.789 INFO  [main] MCP server listening on port 8080
```

### Accessing Metrics Locally

View metrics in your browser or with curl:

```bash
# Browser
open http://localhost:8080/metrics

# curl
curl http://localhost:8080/metrics

# Pretty print specific metrics
curl -s http://localhost:8080/metrics | grep cycletime_mcp
```

### Health Check Testing

Test health checks during development:

```bash
# Check overall health
curl http://localhost:8080/health | jq '.'

# Monitor health continuously
watch -n 5 'curl -s http://localhost:8080/health | jq ".components"'

# Test specific component status
curl -s http://localhost:8080/health | jq '.components.database'
```

**Simulating degraded state:**
```bash
# Load memory to trigger degraded status
# (implementation-specific, not recommended)
```

## Production Deployment

### Environment Variable Configuration

Production deployments require explicit configuration:

```bash
# Required for JSON logging
export LOGBACK_CONFIGURATION_FILE=logback-prod.xml

# Optional: Disable metrics if not using Prometheus
export METRICS_ENABLED=true

# Application configuration
export KTOR_ENV=production
export KTOR_PORT=8080
export DATABASE_PATH=/data/cycletime-ce.db
```

**Systemd service example:**
```ini
[Unit]
Description=CycleTime CE
After=network.target

[Service]
Type=simple
User=cycletime
WorkingDirectory=/opt/cycletime
ExecStart=/opt/cycletime/bin/cycletime-ce
Environment="LOGBACK_CONFIGURATION_FILE=logback-prod.xml"
Environment="METRICS_ENABLED=true"
Environment="KTOR_ENV=production"
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Docker Compose Example with Observability

Complete production stack with observability:

```yaml
version: '3.8'

services:
  cycletime:
    image: cycletime-ce:latest
    container_name: cycletime
    environment:
      LOGBACK_CONFIGURATION_FILE: logback-prod.xml
      METRICS_ENABLED: "true"
      KTOR_ENV: production
      DATABASE_PATH: /data/cycletime-ce.db
    ports:
      - "8080:8080"
    volumes:
      - cycletime-data:/data
      - cycletime-logs:/app/logs
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        labels: "app=cycletime,environment=production"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    command: -config.file=/etc/loki/config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml:ro
      - loki-data:/loki
    ports:
      - "3100:3100"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
      - loki
    restart: unless-stopped

volumes:
  cycletime-data:
  cycletime-logs:
  prometheus-data:
  loki-data:
  grafana-data:
```

### Log Retention

Configure log retention to manage disk space:

**Logback rolling policy (logback-prod.xml):**
```xml
<rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
    <fileNamePattern>logs/cycletime.%d{yyyy-MM-dd}.json.gz</fileNamePattern>
    <maxHistory>30</maxHistory>
    <totalSizeCap>10GB</totalSizeCap>
</rollingPolicy>
```

**Settings:**
- `maxHistory: 30` - Keep 30 days of logs (default)
- `totalSizeCap: 10GB` - Maximum total log size
- Compression: `.gz` extension enables gzip compression

**Loki retention:**
```yaml
# loki-config.yaml
limits_config:
  retention_period: 720h  # 30 days
```

**Docker log rotation:**
```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "10"
```

### Metrics Scrape Interval Recommendations

**Development/Testing:**
- Scrape interval: 30s
- Lower frequency reduces overhead
- Sufficient for troubleshooting

**Production (standard):**
- Scrape interval: 15s
- Good balance of granularity and overhead
- Recommended for most deployments

**Production (high-traffic):**
- Scrape interval: 10s
- Higher granularity for detailed analysis
- Slightly higher Prometheus storage requirements

**Prometheus configuration:**
```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
```

## Troubleshooting

### Metrics Endpoint Returns 404

**Symptom:**
```bash
curl http://localhost:8080/metrics
# 404 Not Found
```

**Cause:** Metrics collection is disabled

**Solution:**
```bash
# Check environment variable
echo $METRICS_ENABLED

# Enable metrics
export METRICS_ENABLED=true

# Restart application
./gradlew run
```

**Docker solution:**
```yaml
environment:
  METRICS_ENABLED: "true"  # Must be string "true" in YAML
```

### JSON Logs Not Appearing

**Symptom:** Logs appear as plain text instead of JSON

**Cause:** Logback production configuration not activated

**Solution:**
```bash
# Verify environment variable
echo $LOGBACK_CONFIGURATION_FILE

# Set correct value
export LOGBACK_CONFIGURATION_FILE=logback-prod.xml

# Verify file exists
ls src/main/resources/logback-prod.xml

# Restart application
```

**Docker solution:**
```yaml
environment:
  LOGBACK_CONFIGURATION_FILE: logback-prod.xml
```

### Health Check Reports Unhealthy

**Symptom:**
```json
{
  "status": "unhealthy",
  "components": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  }
}
```

**Diagnosis:** Check component details in the health response

**Database unhealthy:**
```bash
# Check database file permissions
ls -la cycletime-ce.db

# Check database file location
echo $DATABASE_PATH

# Test database connection manually
sqlite3 cycletime-ce.db "SELECT 1;"
```

**Memory degraded/unhealthy:**
```bash
# Check JVM heap size
java -XX:+PrintFlagsFinal -version | grep HeapSize

# Increase heap if needed
export JAVA_OPTS="-Xmx2g"
```

**MCP unhealthy:** Check application logs for MCP server errors

### Missing Correlation IDs

**Symptom:** Logs don't include `request-id` in MDC

**Cause:** CallId plugin not properly configured

**Diagnosis:**
```bash
# Check logs for plugin initialization
grep "CallId" logs/cycletime.log

# Verify plugin is installed in Application.kt
grep "install(CallId)" src/main/kotlin/io/spiralhouse/cycletime/Application.kt
```

**Solution:** Ensure CallId plugin is installed before route definitions:

```kotlin
fun Application.module() {
    install(CallId) {
        generate { UUID.randomUUID().toString() }
    }
    // ... other plugins
}
```

### Prometheus Not Scraping

**Symptom:** No metrics visible in Prometheus dashboard

**Diagnosis:**
```bash
# Check Prometheus targets page
open http://localhost:9090/targets

# Verify CycleTime endpoint is reachable
curl http://cycletime:8080/metrics
```

**Common issues:**
1. **Network connectivity**: Ensure Prometheus can reach CycleTime host
2. **Port mapping**: Verify Docker port mapping is correct
3. **Firewall rules**: Check firewall allows port 8080

**Solution:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cycletime'
    static_configs:
      - targets: ['cycletime:8080']  # Use Docker service name
    metrics_path: '/metrics'
```

### High Memory Usage Alerts

**Symptom:** Health check shows degraded memory status

**Diagnosis:**
```bash
# Check current memory usage
curl -s http://localhost:8080/health | jq '.components.memory'

# View JVM memory metrics
curl -s http://localhost:8080/metrics | grep jvm_memory_used_bytes
```

**Solutions:**

**1. Increase heap size:**
```bash
export JAVA_OPTS="-Xmx2g"
```

**2. Adjust memory thresholds:**
```kotlin
// Modify AlertService thresholds if 80% is too aggressive
private val memoryWarningThreshold = 0.85  // 85% instead of 80%
```

**3. Investigate memory leaks:**
```bash
# Enable GC logging
export JAVA_OPTS="-Xlog:gc*:file=gc.log"

# Analyze heap dump
jmap -dump:format=b,file=heap.bin <pid>
```

