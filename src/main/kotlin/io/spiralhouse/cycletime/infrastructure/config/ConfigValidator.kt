package io.spiralhouse.cycletime.infrastructure.config

/**
 * Configuration validation exception.
 */
class ConfigurationValidationException(
    val errors: List<String>
) : Exception("Configuration validation failed: ${errors.joinToString(", ")}")

/**
 * Configuration validator for ensuring application settings are valid.
 */
object ConfigValidator {
    
    fun validateDatabaseConfig(config: DatabaseConfig): List<String> {
        val errors = mutableListOf<String>()
        
        if (config.url.isBlank()) {
            errors.add("database.url: Invalid JDBC URL format")
        }
        
        if (config.poolSize <= 0) {
            errors.add("database.poolSize: Must be greater than 0")
        }
        
        return errors
    }
    
    fun validateServerConfig(config: ServerConfig): List<String> {
        val errors = mutableListOf<String>()
        
        if (config.port !in 1..65535) {
            errors.add("server.port: Must be between 1 and 65535")
        }
        
        return errors
    }
    
    fun validateApplicationConfig(config: ApplicationConfig): List<String> {
        val errors = mutableListOf<String>()
        
        errors.addAll(validateDatabaseConfig(config.database))
        errors.addAll(validateServerConfig(config.server))
        
        return errors
    }
}