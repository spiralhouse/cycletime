# Configuration Management - Technical Design

## Overview

This document outlines the configuration management strategy for CycleTime using Ktor's HOCON (Human-Optimized Config Object Notation) configuration system integrated with dependency injection. The design enables environment-specific configurations, secure secret management, and runtime configuration updates while maintaining testability.

## Core Principles

### 1. Environment-Based Configuration

- **Development**: Local development with verbose logging
- **Testing**: In-memory databases and mock services
- **Staging**: Production-like with test data
- **Production**: Optimized settings with monitoring

### 2. Configuration Hierarchy

```
1. Default Configuration (application.conf)
2. Environment-Specific Overrides (application-{env}.conf)
3. System Properties (-Dconfig.override=value)
4. Environment Variables (CONFIG_OVERRIDE=value)
5. Runtime Updates (via API or MCP tools)
```

### 3. Security First

- **No Secrets in Code**: All secrets via environment variables
- **Encryption at Rest**: Sensitive configs encrypted
- **Audit Trail**: Configuration changes logged
- **Least Privilege**: Minimal access to production configs

## HOCON Configuration Structure

### Base Configuration

```hocon
# src/main/resources/application.conf

ktor {
    deployment {
        port = 8080
        port = ${?PORT}
        
        watch = [ classes, resources ]
        
        shutdown {
            url = "/shutdown"
            exitCode = 0
        }
    }
    
    application {
        modules = [ 
            io.spiralhouse.cycletime.ApplicationKt.module,
            io.spiralhouse.cycletime.infrastructure.di.DIConfigurationKt.configureDependencies,
            io.spiralhouse.cycletime.infrastructure.mcp.MCPConfigurationKt.configureMCP
        ]
    }
    
    environment = development
    environment = ${?KTOR_ENV}
}

cycletime {
    server {
        name = "CycleTime MCP Server"
        version = "1.0.0"
        
        cors {
            enabled = true
            hosts = ["localhost:3000", "claude.ai"]
            headers = ["Content-Type", "Authorization"]
        }
        
        rateLimit {
            enabled = true
            requestsPerMinute = 60
            requestsPerMinute = ${?RATE_LIMIT_RPM}
        }
    }
    
    database {
        type = "h2"
        
        h2 {
            url = "jdbc:h2:file:./data/cycletime;AUTO_SERVER=TRUE"
            url = ${?DATABASE_URL}
            
            driver = "org.h2.Driver"
            
            pool {
                maxSize = 10
                minIdle = 2
                connectionTimeout = 10000
                idleTimeout = 600000
                maxLifetime = 1800000
            }
            
            options {
                autoCommit = false
                transactionIsolation = "TRANSACTION_READ_COMMITTED"
                cacheSize = 10240
                lockTimeout = 5000
            }
        }
        
        migrations {
            enabled = true
            location = "db/migrations"
            validateOnMigrate = true
        }
    }
    
    mcp {
        enabled = true
        
        websocket {
            path = "/mcp"
            pingInterval = 30000
            timeout = 15000
            maxFrameSize = 1048576  # 1MB
        }
        
        resources {
            maxListSize = 1000
            cacheEnabled = true
            cacheTtl = 300000  # 5 minutes
        }
        
        tools {
            maxConcurrent = 10
            timeout = 30000
            retryAttempts = 3
        }
    }
    
    session {
        maxAge = 604800000  # 7 days
        cleanupInterval = 3600000  # 1 hour
        maxSessions = 10000
    }
    
    logging {
        level = INFO
        level = ${?LOG_LEVEL}
        
        loggers {
            "io.spiralhouse.cycletime" = DEBUG
            "org.jetbrains.exposed" = WARN
            "io.ktor" = INFO
            "com.zaxxer.hikari" = WARN
        }
        
        output {
            console = true
            file {
                enabled = false
                path = "./logs/cycletime.log"
                maxSize = "10MB"
                maxHistory = 30
            }
        }
    }
    
    monitoring {
        metrics {
            enabled = true
            port = 9090
            path = "/metrics"
        }
        
        health {
            enabled = true
            path = "/health"
            detailed = false
            detailed = ${?HEALTH_DETAILED}
        }
        
        tracing {
            enabled = false
            enabled = ${?TRACING_ENABLED}
            
            opentelemetry {
                endpoint = "http://localhost:4317"
                endpoint = ${?OTEL_EXPORTER_OTLP_ENDPOINT}
                serviceName = "cycletime"
            }
        }
    }
    
    features {
        tdd {
            enabled = true
            autoGenerateTests = false
        }
        
        linearIntegration {
            enabled = false
            enabled = ${?LINEAR_ENABLED}
            apiKey = ${?LINEAR_API_KEY}
            teamId = ${?LINEAR_TEAM_ID}
        }
        
        githubIntegration {
            enabled = false
            enabled = ${?GITHUB_ENABLED}
            token = ${?GITHUB_TOKEN}
            owner = ${?GITHUB_OWNER}
            repo = ${?GITHUB_REPO}
        }
    }
}
```

### Environment-Specific Configurations

#### Development Configuration

```hocon
# src/main/resources/application-development.conf

include "application.conf"

ktor {
    development = true
    
    deployment {
        watch = [ classes, resources ]
    }
}

cycletime {
    database {
        h2 {
            url = "jdbc:h2:file:./data/dev;AUTO_SERVER=TRUE;TRACE_LEVEL_FILE=4"
        }
    }
    
    logging {
        level = DEBUG
        
        loggers {
            "io.spiralhouse.cycletime" = TRACE
            "org.jetbrains.exposed.sql" = DEBUG
        }
        
        output {
            console = true
            file {
                enabled = true
                path = "./logs/dev.log"
            }
        }
    }
    
    monitoring {
        health {
            detailed = true
        }
    }
    
    features {
        tdd {
            autoGenerateTests = true
        }
    }
}
```

#### Testing Configuration

```hocon
# src/main/resources/application-test.conf

include "application.conf"

ktor {
    environment = test
}

cycletime {
    database {
        h2 {
            url = "jdbc:h2:mem:test;DB_CLOSE_DELAY=-1"
            
            pool {
                maxSize = 1
                minIdle = 1
            }
        }
        
        migrations {
            enabled = false
        }
    }
    
    mcp {
        enabled = true
        
        websocket {
            pingInterval = 1000
            timeout = 5000
        }
    }
    
    session {
        maxAge = 60000  # 1 minute for tests
        cleanupInterval = 10000
    }
    
    logging {
        level = WARN
        
        loggers {
            "io.spiralhouse.cycletime.test" = DEBUG
        }
        
        output {
            console = true
            file {
                enabled = false
            }
        }
    }
    
    monitoring {
        metrics {
            enabled = false
        }
    }
}
```

#### Production Configuration

```hocon
# src/main/resources/application-production.conf

include "application.conf"

ktor {
    development = false
    environment = production
}

cycletime {
    server {
        cors {
            hosts = [${CORS_ALLOWED_HOSTS}]
        }
        
        rateLimit {
            requestsPerMinute = 100
        }
    }
    
    database {
        h2 {
            url = ${DATABASE_URL}
            
            pool {
                maxSize = 20
                minIdle = 5
                connectionTimeout = 30000
            }
            
            options {
                cacheSize = 32768
            }
        }
    }
    
    logging {
        level = WARN
        
        loggers {
            "io.spiralhouse.cycletime" = INFO
            "org.jetbrains.exposed" = ERROR
        }
        
        output {
            console = false
            file {
                enabled = true
                path = "/var/log/cycletime/app.log"
                maxSize = "100MB"
                maxHistory = 90
            }
        }
    }
    
    monitoring {
        metrics {
            enabled = true
        }
        
        health {
            detailed = false
        }
        
        tracing {
            enabled = true
        }
    }
}
```

## Configuration Loading with DI

### Configuration Data Classes

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/config/ConfigModels.kt

import kotlinx.serialization.Serializable
import kotlin.time.Duration

/**
 * Root configuration
 */
@Serializable
data class CycleTimeConfig(
    val server: ServerConfig,
    val database: DatabaseConfig,
    val mcp: MCPConfig,
    val session: SessionConfig,
    val logging: LoggingConfig,
    val monitoring: MonitoringConfig,
    val features: FeaturesConfig
)

@Serializable
data class ServerConfig(
    val name: String,
    val version: String,
    val cors: CorsConfig,
    val rateLimit: RateLimitConfig
)

@Serializable
data class CorsConfig(
    val enabled: Boolean,
    val hosts: List<String>,
    val headers: List<String>
)

@Serializable
data class RateLimitConfig(
    val enabled: Boolean,
    val requestsPerMinute: Int
)

@Serializable
data class DatabaseConfig(
    val type: String,
    val h2: H2Config?,
    val migrations: MigrationConfig
)

@Serializable
data class H2Config(
    val url: String,
    val driver: String,
    val pool: PoolConfig,
    val options: H2Options
)

@Serializable
data class PoolConfig(
    val maxSize: Int,
    val minIdle: Int,
    val connectionTimeout: Long,
    val idleTimeout: Long,
    val maxLifetime: Long
)

@Serializable
data class MCPConfig(
    val enabled: Boolean,
    val websocket: WebSocketConfig,
    val resources: ResourceConfig,
    val tools: ToolConfig
)

@Serializable
data class SessionConfig(
    val maxAge: Long,
    val cleanupInterval: Long,
    val maxSessions: Int
)

@Serializable
data class LoggingConfig(
    val level: String,
    val loggers: Map<String, String>,
    val output: OutputConfig
)

@Serializable
data class MonitoringConfig(
    val metrics: MetricsConfig,
    val health: HealthConfig,
    val tracing: TracingConfig
)

@Serializable
data class FeaturesConfig(
    val tdd: TDDConfig,
    val linearIntegration: LinearConfig?,
    val githubIntegration: GitHubConfig?
)
```

### Configuration Service

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/config/ConfigurationService.kt

import io.ktor.server.application.*
import io.ktor.server.config.*
import com.typesafe.config.ConfigFactory
import com.typesafe.config.Config

/**
 * Service for managing application configuration
 */
class ConfigurationService(
    private val environment: ApplicationEnvironment
) {
    private val config: Config = ConfigFactory.load()
    private var cycletimeConfig: CycleTimeConfig = loadConfiguration()
    private val listeners = mutableListOf<ConfigurationListener>()
    
    /**
     * Load configuration from HOCON
     */
    private fun loadConfiguration(): CycleTimeConfig {
        val appConfig = environment.config
        
        return CycleTimeConfig(
            server = loadServerConfig(appConfig),
            database = loadDatabaseConfig(appConfig),
            mcp = loadMCPConfig(appConfig),
            session = loadSessionConfig(appConfig),
            logging = loadLoggingConfig(appConfig),
            monitoring = loadMonitoringConfig(appConfig),
            features = loadFeaturesConfig(appConfig)
        )
    }
    
    /**
     * Get current configuration
     */
    fun getConfig(): CycleTimeConfig = cycletimeConfig
    
    /**
     * Get specific configuration section
     */
    inline fun <reified T> getSection(): T {
        return when (T::class) {
            ServerConfig::class -> cycletimeConfig.server as T
            DatabaseConfig::class -> cycletimeConfig.database as T
            MCPConfig::class -> cycletimeConfig.mcp as T
            SessionConfig::class -> cycletimeConfig.session as T
            LoggingConfig::class -> cycletimeConfig.logging as T
            MonitoringConfig::class -> cycletimeConfig.monitoring as T
            FeaturesConfig::class -> cycletimeConfig.features as T
            else -> throw IllegalArgumentException("Unknown config type: ${T::class}")
        }
    }
    
    /**
     * Update configuration at runtime
     */
    fun updateConfig(updates: Map<String, Any>) {
        // Apply updates
        val updatedConfig = applyUpdates(cycletimeConfig, updates)
        
        // Validate new configuration
        validateConfiguration(updatedConfig)
        
        // Store and notify
        cycletimeConfig = updatedConfig
        notifyListeners(updatedConfig)
    }
    
    /**
     * Register configuration change listener
     */
    fun addListener(listener: ConfigurationListener) {
        listeners.add(listener)
    }
    
    /**
     * Validate configuration
     */
    private fun validateConfiguration(config: CycleTimeConfig) {
        // Database validation
        require(config.database.h2?.url?.isNotBlank() == true) {
            "Database URL is required"
        }
        
        // Pool size validation
        require(config.database.h2?.pool?.maxSize ?: 0 > 0) {
            "Database pool max size must be positive"
        }
        
        // Session validation
        require(config.session.maxAge > 0) {
            "Session max age must be positive"
        }
        
        // MCP validation
        if (config.mcp.enabled) {
            require(config.mcp.websocket.path.isNotBlank()) {
                "MCP WebSocket path is required"
            }
        }
    }
    
    private fun notifyListeners(config: CycleTimeConfig) {
        listeners.forEach { it.onConfigurationChanged(config) }
    }
    
    /**
     * Load server configuration
     */
    private fun loadServerConfig(config: ApplicationConfig): ServerConfig {
        return ServerConfig(
            name = config.property("cycletime.server.name").getString(),
            version = config.property("cycletime.server.version").getString(),
            cors = CorsConfig(
                enabled = config.propertyOrNull("cycletime.server.cors.enabled")?.getString()?.toBoolean() ?: true,
                hosts = config.propertyOrNull("cycletime.server.cors.hosts")?.getList() ?: emptyList(),
                headers = config.propertyOrNull("cycletime.server.cors.headers")?.getList() ?: emptyList()
            ),
            rateLimit = RateLimitConfig(
                enabled = config.propertyOrNull("cycletime.server.rateLimit.enabled")?.getString()?.toBoolean() ?: true,
                requestsPerMinute = config.propertyOrNull("cycletime.server.rateLimit.requestsPerMinute")?.getString()?.toInt() ?: 60
            )
        )
    }
    
    private fun loadDatabaseConfig(config: ApplicationConfig): DatabaseConfig {
        val type = config.property("cycletime.database.type").getString()
        
        return DatabaseConfig(
            type = type,
            h2 = if (type == "h2") {
                H2Config(
                    url = config.property("cycletime.database.h2.url").getString(),
                    driver = config.property("cycletime.database.h2.driver").getString(),
                    pool = PoolConfig(
                        maxSize = config.property("cycletime.database.h2.pool.maxSize").getString().toInt(),
                        minIdle = config.property("cycletime.database.h2.pool.minIdle").getString().toInt(),
                        connectionTimeout = config.property("cycletime.database.h2.pool.connectionTimeout").getString().toLong(),
                        idleTimeout = config.property("cycletime.database.h2.pool.idleTimeout").getString().toLong(),
                        maxLifetime = config.property("cycletime.database.h2.pool.maxLifetime").getString().toLong()
                    ),
                    options = H2Options(
                        autoCommit = config.propertyOrNull("cycletime.database.h2.options.autoCommit")?.getString()?.toBoolean() ?: false,
                        transactionIsolation = config.propertyOrNull("cycletime.database.h2.options.transactionIsolation")?.getString() ?: "TRANSACTION_READ_COMMITTED",
                        cacheSize = config.propertyOrNull("cycletime.database.h2.options.cacheSize")?.getString()?.toInt() ?: 10240,
                        lockTimeout = config.propertyOrNull("cycletime.database.h2.options.lockTimeout")?.getString()?.toInt() ?: 5000
                    )
                )
            } else null,
            migrations = MigrationConfig(
                enabled = config.propertyOrNull("cycletime.database.migrations.enabled")?.getString()?.toBoolean() ?: true,
                location = config.propertyOrNull("cycletime.database.migrations.location")?.getString() ?: "db/migrations",
                validateOnMigrate = config.propertyOrNull("cycletime.database.migrations.validateOnMigrate")?.getString()?.toBoolean() ?: true
            )
        )
    }
}

/**
 * Configuration change listener
 */
interface ConfigurationListener {
    fun onConfigurationChanged(config: CycleTimeConfig)
}
```

### DI Module for Configuration

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/di/ConfigurationModule.kt

import io.ktor.server.application.*
import io.ktor.server.di.*
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database

/**
 * Configuration DI module
 */
val configurationModule = DIModule("configuration") {
    single<ConfigurationService> {
        ConfigurationService(environment)
    }
    
    single<CycleTimeConfig> {
        get<ConfigurationService>().getConfig()
    }
    
    single<DatabaseConfig> {
        get<ConfigurationService>().getSection<DatabaseConfig>()
    }
    
    single<MCPConfig> {
        get<ConfigurationService>().getSection<MCPConfig>()
    }
    
    single<SessionConfig> {
        get<ConfigurationService>().getSection<SessionConfig>()
    }
}

/**
 * Database module using configuration
 */
val databaseModule = DIModule("database") {
    single<HikariDataSource> {
        val dbConfig = get<DatabaseConfig>()
        val h2Config = dbConfig.h2 ?: throw IllegalStateException("H2 configuration required")
        
        val hikariConfig = HikariConfig().apply {
            jdbcUrl = h2Config.url
            driverClassName = h2Config.driver
            maximumPoolSize = h2Config.pool.maxSize
            minimumIdle = h2Config.pool.minIdle
            connectionTimeout = h2Config.pool.connectionTimeout
            idleTimeout = h2Config.pool.idleTimeout
            maxLifetime = h2Config.pool.maxLifetime
            isAutoCommit = h2Config.options.autoCommit
            transactionIsolation = h2Config.options.transactionIsolation
            
            // H2-specific optimizations
            addDataSourceProperty("cacheSize", h2Config.options.cacheSize)
            addDataSourceProperty("lockTimeout", h2Config.options.lockTimeout)
        }
        
        HikariDataSource(hikariConfig)
    }
    
    single<Database> {
        Database.connect(get<HikariDataSource>())
    }
    
    single<DatabaseInitializer> {
        DatabaseInitializer(
            database = get(),
            migrationConfig = get<DatabaseConfig>().migrations
        )
    }
}
```

## Secret Management

### Environment Variable Provider

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/config/SecretProvider.kt

/**
 * Provider for secure secret management
 */
interface SecretProvider {
    suspend fun getSecret(key: String): String?
    suspend fun setSecret(key: String, value: String)
    suspend fun deleteSecret(key: String)
}

/**
 * Environment variable based secret provider
 */
class EnvironmentSecretProvider : SecretProvider {
    override suspend fun getSecret(key: String): String? {
        return System.getenv(key)
    }
    
    override suspend fun setSecret(key: String, value: String) {
        // Cannot set environment variables at runtime
        throw UnsupportedOperationException("Cannot set environment variables at runtime")
    }
    
    override suspend fun deleteSecret(key: String) {
        // Cannot delete environment variables at runtime
        throw UnsupportedOperationException("Cannot delete environment variables at runtime")
    }
}

/**
 * Encrypted file-based secret provider for development
 */
class FileSecretProvider(
    private val secretsFile: File,
    private val encryptionKey: String
) : SecretProvider {
    private val secrets = mutableMapOf<String, String>()
    
    init {
        loadSecrets()
    }
    
    override suspend fun getSecret(key: String): String? {
        return secrets[key]
    }
    
    override suspend fun setSecret(key: String, value: String) {
        secrets[key] = value
        saveSecrets()
    }
    
    override suspend fun deleteSecret(key: String) {
        secrets.remove(key)
        saveSecrets()
    }
    
    private fun loadSecrets() {
        if (secretsFile.exists()) {
            val encrypted = secretsFile.readText()
            val decrypted = decrypt(encrypted, encryptionKey)
            secrets.putAll(Json.decodeFromString(decrypted))
        }
    }
    
    private fun saveSecrets() {
        val json = Json.encodeToString(secrets)
        val encrypted = encrypt(json, encryptionKey)
        secretsFile.writeText(encrypted)
    }
    
    private fun encrypt(data: String, key: String): String {
        // Implementation using AES encryption
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val secretKey = SecretKeySpec(key.toByteArray(), "AES")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val encrypted = cipher.doFinal(data.toByteArray())
        return Base64.getEncoder().encodeToString(encrypted)
    }
    
    private fun decrypt(data: String, key: String): String {
        // Implementation using AES decryption
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val secretKey = SecretKeySpec(key.toByteArray(), "AES")
        cipher.init(Cipher.DECRYPT_MODE, secretKey)
        val decrypted = cipher.doFinal(Base64.getDecoder().decode(data))
        return String(decrypted)
    }
}
```

## Runtime Configuration Updates

### Configuration API

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/api/ConfigurationController.kt

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*

/**
 * API for runtime configuration management
 */
fun Route.configurationRoutes(configService: ConfigurationService) {
    route("/api/config") {
        
        // Get current configuration (sanitized)
        get {
            val config = configService.getConfig()
            val sanitized = sanitizeConfig(config)
            call.respond(sanitized)
        }
        
        // Update configuration
        put {
            val updates = call.receive<Map<String, Any>>()
            
            try {
                configService.updateConfig(updates)
                call.respond(HttpStatusCode.OK, mapOf("status" to "updated"))
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    mapOf("error" to e.message)
                )
            }
        }
        
        // Get specific section
        get("/{section}") {
            val section = call.parameters["section"]
            
            val sectionConfig = when (section) {
                "server" -> configService.getSection<ServerConfig>()
                "database" -> sanitizeDatabaseConfig(configService.getSection<DatabaseConfig>())
                "mcp" -> configService.getSection<MCPConfig>()
                "session" -> configService.getSection<SessionConfig>()
                "logging" -> configService.getSection<LoggingConfig>()
                "monitoring" -> configService.getSection<MonitoringConfig>()
                "features" -> configService.getSection<FeaturesConfig>()
                else -> null
            }
            
            if (sectionConfig != null) {
                call.respond(sectionConfig)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
    }
}

/**
 * Remove sensitive information from config
 */
private fun sanitizeConfig(config: CycleTimeConfig): CycleTimeConfig {
    return config.copy(
        database = sanitizeDatabaseConfig(config.database),
        features = sanitizeFeaturesConfig(config.features)
    )
}

private fun sanitizeDatabaseConfig(config: DatabaseConfig): DatabaseConfig {
    return config.copy(
        h2 = config.h2?.copy(
            url = config.h2.url.replace(Regex("password=[^;]*"), "password=***")
        )
    )
}

private fun sanitizeFeaturesConfig(config: FeaturesConfig): FeaturesConfig {
    return config.copy(
        linearIntegration = config.linearIntegration?.copy(
            apiKey = "***"
        ),
        githubIntegration = config.githubIntegration?.copy(
            token = "***"
        )
    )
}
```

### MCP Configuration Tool

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/mcp/tools/ConfigurationTool.kt

/**
 * MCP tool for configuration management
 */
class ConfigurationTool(
    private val configService: ConfigurationService
) : MCPTool {
    
    override val name = "cycletime_update_config"
    
    override val description = "Update runtime configuration"
    
    override val inputSchema = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {
            put("section", buildJsonObject {
                put("type", "string")
                put("enum", buildJsonArray {
                    add("logging")
                    add("monitoring")
                    add("session")
                    add("mcp")
                })
            })
            put("updates", buildJsonObject {
                put("type", "object")
                put("description", "Key-value pairs to update")
            })
        })
        put("required", buildJsonArray {
            add("section")
            add("updates")
        })
    }
    
    override suspend fun execute(arguments: JsonObject): JsonObject {
        val section = arguments["section"]?.jsonPrimitive?.content
            ?: throw ValidationException("Section is required")
        
        val updates = arguments["updates"]?.jsonObject
            ?: throw ValidationException("Updates are required")
        
        val updateMap = updates.entries.associate { (key, value) ->
            "$section.$key" to when (value) {
                is JsonPrimitive -> {
                    when {
                        value.isString -> value.content
                        value.booleanOrNull != null -> value.boolean
                        value.intOrNull != null -> value.int
                        value.longOrNull != null -> value.long
                        value.doubleOrNull != null -> value.double
                        else -> value.content
                    }
                }
                else -> value.toString()
            }
        }
        
        return try {
            configService.updateConfig(updateMap)
            buildJsonObject {
                put("success", true)
                put("message", "Configuration updated")
                put("section", section)
            }
        } catch (e: Exception) {
            buildJsonObject {
                put("success", false)
                put("error", e.message ?: "Update failed")
            }
        }
    }
}
```

## Configuration Validation

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/config/ConfigurationValidator.kt

/**
 * Validator for configuration values
 */
class ConfigurationValidator {
    
    /**
     * Validate complete configuration
     */
    fun validate(config: CycleTimeConfig): ValidationResult {
        val errors = mutableListOf<ValidationError>()
        
        // Server validation
        validateServer(config.server, errors)
        
        // Database validation
        validateDatabase(config.database, errors)
        
        // MCP validation
        if (config.mcp.enabled) {
            validateMCP(config.mcp, errors)
        }
        
        // Session validation
        validateSession(config.session, errors)
        
        // Features validation
        validateFeatures(config.features, errors)
        
        return ValidationResult(
            isValid = errors.isEmpty(),
            errors = errors
        )
    }
    
    private fun validateServer(config: ServerConfig, errors: MutableList<ValidationError>) {
        if (config.name.isBlank()) {
            errors.add(ValidationError("server.name", "Server name cannot be blank"))
        }
        
        if (config.rateLimit.enabled && config.rateLimit.requestsPerMinute <= 0) {
            errors.add(ValidationError("server.rateLimit.requestsPerMinute", "Must be positive"))
        }
    }
    
    private fun validateDatabase(config: DatabaseConfig, errors: MutableList<ValidationError>) {
        val h2 = config.h2
        if (h2 == null) {
            errors.add(ValidationError("database.h2", "H2 configuration is required"))
            return
        }
        
        if (h2.url.isBlank()) {
            errors.add(ValidationError("database.h2.url", "Database URL cannot be blank"))
        }
        
        if (h2.pool.maxSize <= 0) {
            errors.add(ValidationError("database.h2.pool.maxSize", "Pool max size must be positive"))
        }
        
        if (h2.pool.minIdle < 0) {
            errors.add(ValidationError("database.h2.pool.minIdle", "Pool min idle cannot be negative"))
        }
        
        if (h2.pool.minIdle > h2.pool.maxSize) {
            errors.add(ValidationError("database.h2.pool", "Min idle cannot exceed max size"))
        }
    }
    
    private fun validateMCP(config: MCPConfig, errors: MutableList<ValidationError>) {
        if (config.websocket.path.isBlank()) {
            errors.add(ValidationError("mcp.websocket.path", "WebSocket path cannot be blank"))
        }
        
        if (config.websocket.pingInterval <= 0) {
            errors.add(ValidationError("mcp.websocket.pingInterval", "Ping interval must be positive"))
        }
        
        if (config.tools.maxConcurrent <= 0) {
            errors.add(ValidationError("mcp.tools.maxConcurrent", "Max concurrent must be positive"))
        }
    }
    
    private fun validateSession(config: SessionConfig, errors: MutableList<ValidationError>) {
        if (config.maxAge <= 0) {
            errors.add(ValidationError("session.maxAge", "Max age must be positive"))
        }
        
        if (config.cleanupInterval <= 0) {
            errors.add(ValidationError("session.cleanupInterval", "Cleanup interval must be positive"))
        }
        
        if (config.maxSessions <= 0) {
            errors.add(ValidationError("session.maxSessions", "Max sessions must be positive"))
        }
    }
    
    private fun validateFeatures(config: FeaturesConfig, errors: MutableList<ValidationError>) {
        config.linearIntegration?.let { linear ->
            if (linear.enabled && linear.apiKey.isNullOrBlank()) {
                errors.add(ValidationError("features.linearIntegration.apiKey", "API key required when enabled"))
            }
        }
        
        config.githubIntegration?.let { github ->
            if (github.enabled && github.token.isNullOrBlank()) {
                errors.add(ValidationError("features.githubIntegration.token", "Token required when enabled"))
            }
        }
    }
}

data class ValidationResult(
    val isValid: Boolean,
    val errors: List<ValidationError>
)

data class ValidationError(
    val path: String,
    val message: String
)
```

## Testing Configuration

```kotlin
// src/test/kotlin/io/spiralhouse/cycletime/config/ConfigurationServiceTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.ktor.server.testing.*

class ConfigurationServiceTest : DescribeSpec({
    
    describe("ConfigurationService") {
        
        it("should load default configuration") {
            testApplication {
                val configService = ConfigurationService(environment)
                val config = configService.getConfig()
                
                config shouldNotBe null
                config.server.name shouldBe "CycleTime MCP Server"
                config.database.type shouldBe "h2"
            }
        }
        
        it("should override with environment variables") {
            withEnvironment(mapOf(
                "PORT" to "9090",
                "DATABASE_URL" to "jdbc:h2:mem:test",
                "LOG_LEVEL" to "DEBUG"
            )) {
                testApplication {
                    val configService = ConfigurationService(environment)
                    val config = configService.getConfig()
                    
                    // Verify overrides applied
                    config.logging.level shouldBe "DEBUG"
                }
            }
        }
        
        it("should validate configuration") {
            testApplication {
                val configService = ConfigurationService(environment)
                val validator = ConfigurationValidator()
                
                val result = validator.validate(configService.getConfig())
                
                result.isValid shouldBe true
                result.errors shouldBe emptyList()
            }
        }
        
        it("should update configuration at runtime") {
            testApplication {
                val configService = ConfigurationService(environment)
                var notified = false
                
                configService.addListener(object : ConfigurationListener {
                    override fun onConfigurationChanged(config: CycleTimeConfig) {
                        notified = true
                    }
                })
                
                configService.updateConfig(mapOf(
                    "logging.level" to "DEBUG"
                ))
                
                notified shouldBe true
                configService.getConfig().logging.level shouldBe "DEBUG"
            }
        }
    }
})
```

## Environment Setup Scripts

### Development Setup

```bash
#!/bin/bash
# scripts/setup-dev.sh

# Create data directory
mkdir -p ./data

# Set development environment variables
export KTOR_ENV=development
export DATABASE_URL="jdbc:h2:file:./data/dev;AUTO_SERVER=TRUE"
export LOG_LEVEL=DEBUG
export HEALTH_DETAILED=true

# Optional: Set feature flags
export LINEAR_ENABLED=false
export GITHUB_ENABLED=false

echo "Development environment configured"
```

### Production Deployment

```bash
#!/bin/bash
# scripts/deploy-prod.sh

# Required environment variables
: ${DATABASE_URL:?}
: ${CORS_ALLOWED_HOSTS:?}

# Optional but recommended
: ${LINEAR_API_KEY:-}
: ${GITHUB_TOKEN:-}
: ${OTEL_EXPORTER_OTLP_ENDPOINT:-}

# Set production environment
export KTOR_ENV=production
export LOG_LEVEL=WARN
export HEALTH_DETAILED=false
export TRACING_ENABLED=true

# Start application
java -jar cycletime.jar
```

## Best Practices

1. **Environment Separation**: Never mix configurations between environments
2. **Secret Management**: Never commit secrets to version control
3. **Validation**: Always validate configuration before applying
4. **Defaults**: Provide sensible defaults for all settings
5. **Override Hierarchy**: Follow consistent override precedence
6. **Documentation**: Document all configuration options
7. **Type Safety**: Use data classes for configuration
8. **Hot Reload**: Support runtime updates where safe
9. **Monitoring**: Track configuration changes
10. **Testing**: Test with different configuration scenarios

## Summary

This configuration management system provides:
- **HOCON-based configuration** with environment overrides
- **Type-safe configuration** with Kotlin data classes
- **Secure secret management** via environment variables
- **Runtime configuration updates** with validation
- **Environment-specific settings** for dev/test/staging/prod
- **Integration with DI** for clean dependency management
- **Comprehensive validation** to prevent misconfigurations
- **Testing support** with configuration mocking
