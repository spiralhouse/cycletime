# Configuration Guide

## Environment Variables

CycleTime uses environment variables for configuration. All settings have sensible defaults for development.

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `DATABASE_URL` | `jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1` | Database connection string |
| `DATABASE_LOGGING` | `false` | Enable SQL query logging |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARN, ERROR) |

### Example Usage

```bash
# Custom port and database
PORT=3000 DATABASE_URL=jdbc:h2:file:./custom;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1 ./gradlew run

# Enable debug logging
LOG_LEVEL=DEBUG DATABASE_LOGGING=true ./gradlew run
```

## Configuration Files

### Application Configuration
Location: `src/main/resources/application.conf`

```hocon
ktor {
    deployment {
        port = 8080
        port = ${?PORT}
    }
    application {
        modules = [ io.spiralhouse.jcvd.ApplicationKt.module ]
    }
}
```

### Gradle Properties
Location: `gradle.properties`

```properties
# JVM settings
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.configuration-cache=true
org.gradle.parallel=true
```

## Docker Configuration

### Environment File
Create a `.env` file for Docker:

```env
PORT=8080
DATABASE_URL=jdbc:h2:file:/data/cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
LOG_LEVEL=INFO
```

### Docker Compose
```yaml
version: '3.8'
services:
  jcvd:
    image: ghcr.io/spiralhouse/jcvd:latest
    env_file: .env
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
```

## Database Configuration

### H2 File-based (Default)
```bash
DATABASE_URL=jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
```

### H2 (In-Memory)
```bash
DATABASE_URL=jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
```

### H2 (Custom File Location)
```bash
DATABASE_URL=jdbc:h2:file:/data/cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
```

## Production Configuration

For production deployments:

1. Use environment variables, not config files
2. Enable proper logging
3. Configure database backups
4. Set appropriate JVM memory settings

See [Deployment Guide](../operations/deployment-guide.md) for details.