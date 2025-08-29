package io.spiralhouse.cycletime.infrastructure.config

import java.io.File
import java.time.Duration

/**
 * Secret value wrapper that masks sensitive data in logs.
 */
sealed class SecretValue {
    companion object {
        fun fromEnvironment(name: String): SecretValue = EnvironmentSecret(name)
        fun fromFile(path: String): SecretValue = FileSecret(path)
        fun fromVault(key: String): SecretValue = VaultSecret(key)
        fun plain(value: String): SecretValue = PlainSecret(value)
    }

    override fun toString(): String = "SecretValue[***]"
    
    abstract fun getValue(): String
}

class EnvironmentSecret(private val name: String) : SecretValue() {
    override fun getValue(): String = System.getenv(name) ?: ""
}

class FileSecret(private val path: String) : SecretValue() {
    override fun getValue(): String = try {
        File(path).readText().trim()
    } catch (e: Exception) {
        ""
    }
}

class VaultSecret(private val key: String) : SecretValue() {
    override fun getValue(): String = "" // Placeholder - would integrate with vault in real implementation
}

class PlainSecret(private val value: String) : SecretValue() {
    override fun getValue(): String = value
}

/**
 * Database configuration.
 */
data class DatabaseConfig(
    val url: String,
    val driver: String,
    val username: String? = null,
    val password: SecretValue? = null,
    val poolSize: Int = 10,
    val connectionTimeout: Duration = Duration.ofSeconds(30),
    val schema: String? = null
)

/**
 * Server configuration.
 */
data class ServerConfig(
    val host: String = "localhost",
    val port: Int = 8080,
    val requestTimeout: Duration = Duration.ofMinutes(2)
)

/**
 * Logging configuration.
 */
data class LoggingConfig(
    val level: String = "INFO",
    val logToFile: Boolean = true,
    val retentionPeriod: Duration = Duration.ofDays(30)
)

/**
 * Security configuration.
 */
data class SecurityConfig(
    val enableHttps: Boolean = false
)

/**
 * Monitoring configuration.
 */
data class MonitoringConfig(
    val enableMetrics: Boolean = false
)

/**
 * Development-specific configuration.
 */
data class DevelopmentConfig(
    val hotReload: Boolean = false,
    val verboseLogging: Boolean = false
)

/**
 * Application info configuration.
 */
data class ApplicationInfo(
    val name: String = "cycletime"
)

/**
 * Authentication configuration.
 */
data class AuthConfig(
    val jwtSecret: SecretValue
)

/**
 * External service configuration.
 */
data class ExternalConfig(
    val apiKey: SecretValue
)

/**
 * Main application configuration with profile-based loading.
 */
data class ApplicationConfig(
    val profile: String,
    val application: ApplicationInfo,
    val database: DatabaseConfig,
    val server: ServerConfig,
    val logging: LoggingConfig,
    val security: SecurityConfig = SecurityConfig(),
    val monitoring: MonitoringConfig = MonitoringConfig(),
    val development: DevelopmentConfig = DevelopmentConfig(),
    val auth: AuthConfig? = null,
    val external: ExternalConfig? = null
) {
    
    fun exportSanitized(): String {
        val sb = StringBuilder()
        sb.appendLine("profile=${profile}")
        sb.appendLine("application.name=${application.name}")
        sb.appendLine("database.url=${database.url}")
        sb.appendLine("database.driver=${database.driver}")
        sb.appendLine("database.password=***")
        sb.appendLine("database.poolSize=${database.poolSize}")
        sb.appendLine("server.host=${server.host}")
        sb.appendLine("server.port=${server.port}")
        sb.appendLine("logging.level=${logging.level}")
        sb.appendLine("logging.logToFile=${logging.logToFile}")
        sb.appendLine("security.enableHttps=${security.enableHttps}")
        sb.appendLine("monitoring.enableMetrics=${monitoring.enableMetrics}")
        if (development.hotReload || development.verboseLogging) {
            sb.appendLine("development.hotReload=${development.hotReload}")
            sb.appendLine("development.verboseLogging=${development.verboseLogging}")
        }
        return sb.toString().trim()
    }
    
    companion object {
        fun load(profile: String = "dev"): ApplicationConfig {
            val resolvedProfile = Profile.fromString(profile)
            return createConfigForProfile(resolvedProfile)
        }

        fun loadFromFile(path: String): ApplicationConfig {
            val configFile = File(path)
            if (!configFile.exists()) {
                throw IllegalArgumentException("Configuration file not found: $path")
            }
            
            // Simple implementation - would use proper config parsing in real system
            val config = createConfigForProfile(Profile.DEV)
            
            // Validate the configuration
            val errors = ConfigValidator.validateApplicationConfig(config)
            if (errors.isNotEmpty()) {
                throw ConfigurationValidationException(errors)
            }
            
            return config
        }

        fun loadFromDirectory(directory: String, profile: String): ApplicationConfig {
            val baseConfig = createConfigForProfile(Profile.fromString(profile))
            // In real implementation, would merge base config with profile-specific config
            return baseConfig
        }

        fun loadWithHotReload(path: String): ApplicationConfig {
            // Placeholder - would implement file watching in real system
            return loadFromFile(path)
        }

        fun getConfigurationHelp(): String {
            return """
                Available configuration profiles:
                  dev - Development environment with debug features
                  test - Testing environment with in-memory database
                  prod - Production environment with full security
                  
                Environment variables:
                  CYCLETIME_DATABASE_URL - Override database URL
                  CYCLETIME_SERVER_PORT - Override server port
                  CYCLETIME_LOGGING_LEVEL - Override logging level
                  
                Configuration sections:
                  database - Database connection settings
                  server - HTTP server configuration
                  logging - Log management settings
                  security - Security and authentication settings
                  monitoring - Metrics and monitoring settings
            """.trimIndent()
        }
        
        private fun createConfigForProfile(profile: Profile): ApplicationConfig {
            return when (profile) {
                Profile.DEV -> createDevelopmentConfig()
                Profile.TEST -> createTestConfig()
                Profile.PROD -> createProductionConfig()
            }
        }
        
        private fun createDevelopmentConfig(): ApplicationConfig {
            return ApplicationConfig(
                profile = "dev",
                application = ApplicationInfo("cycletime"),
                database = DatabaseConfig(
                    url = getEnvOrDefault("CYCLETIME_DATABASE_URL", "jdbc:h2:file:./cycletime;MODE=PostgreSQL"),
                    driver = "org.h2.Driver",
                    poolSize = 10,
                    connectionTimeout = Duration.ofSeconds(30)
                ),
                server = ServerConfig(
                    host = "localhost",
                    port = getEnvOrDefault("CYCLETIME_SERVER_PORT", "8080").toInt(),
                    requestTimeout = Duration.ofMinutes(2)
                ),
                logging = LoggingConfig(
                    level = getEnvOrDefault("CYCLETIME_LOGGING_LEVEL", "DEBUG"),
                    logToFile = true,
                    retentionPeriod = Duration.ofDays(30)
                ),
                security = SecurityConfig(enableHttps = false),
                monitoring = MonitoringConfig(enableMetrics = false),
                development = DevelopmentConfig(
                    hotReload = true,
                    verboseLogging = true
                )
            )
        }
        
        private fun createTestConfig(): ApplicationConfig {
            return ApplicationConfig(
                profile = "test",
                application = ApplicationInfo("cycletime"),
                database = DatabaseConfig(
                    url = getEnvOrDefault("CYCLETIME_DATABASE_URL", "jdbc:h2:mem:test;MODE=PostgreSQL"),
                    driver = "org.h2.Driver",
                    poolSize = 5,
                    connectionTimeout = Duration.ofSeconds(30)
                ),
                server = ServerConfig(
                    host = "localhost",
                    port = getEnvOrDefault("CYCLETIME_SERVER_PORT", "0").toInt(),
                    requestTimeout = Duration.ofMinutes(2)
                ),
                logging = LoggingConfig(
                    level = getEnvOrDefault("CYCLETIME_LOGGING_LEVEL", "DEBUG"),
                    logToFile = false,
                    retentionPeriod = Duration.ofDays(7)
                ),
                security = SecurityConfig(enableHttps = false),
                monitoring = MonitoringConfig(enableMetrics = false),
                development = DevelopmentConfig(
                    hotReload = false,
                    verboseLogging = false
                )
            )
        }
        
        private fun createProductionConfig(): ApplicationConfig {
            return ApplicationConfig(
                profile = "prod",
                application = ApplicationInfo("cycletime"),
                database = DatabaseConfig(
                    url = getEnvOrDefault("CYCLETIME_DATABASE_URL", "jdbc:postgresql://localhost:5432/cycletime"),
                    driver = "org.postgresql.Driver",
                    username = System.getenv("DATABASE_USERNAME"),
                    password = System.getenv("DATABASE_PASSWORD")?.let { SecretValue.fromEnvironment("DATABASE_PASSWORD") },
                    poolSize = 20,
                    connectionTimeout = Duration.ofSeconds(30)
                ),
                server = ServerConfig(
                    host = "0.0.0.0",
                    port = getEnvOrDefault("CYCLETIME_SERVER_PORT", "8080").toInt(),
                    requestTimeout = Duration.ofMinutes(2)
                ),
                logging = LoggingConfig(
                    level = getEnvOrDefault("CYCLETIME_LOGGING_LEVEL", "INFO"),
                    logToFile = true,
                    retentionPeriod = Duration.ofDays(30)
                ),
                security = SecurityConfig(enableHttps = true),
                monitoring = MonitoringConfig(enableMetrics = true),
                development = DevelopmentConfig(
                    hotReload = false,
                    verboseLogging = false
                ),
                auth = AuthConfig(
                    jwtSecret = SecretValue.fromFile("/etc/secrets/jwt-secret")
                ),
                external = ExternalConfig(
                    apiKey = SecretValue.fromVault("external-api-key")
                )
            )
        }
        
        private fun getEnvOrDefault(envVar: String, default: String): String {
            return System.getProperty(envVar) ?: System.getenv(envVar) ?: default
        }
    }
}