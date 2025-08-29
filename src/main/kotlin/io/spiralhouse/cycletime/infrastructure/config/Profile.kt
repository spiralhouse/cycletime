package io.spiralhouse.cycletime.infrastructure.config

/**
 * Application configuration profiles.
 */
enum class Profile {
    /**
     * Development environment with debug features and local database.
     */
    DEV,
    
    /**
     * Test environment with in-memory database and mock services.
     */
    TEST,
    
    /**
     * Production environment with full security and monitoring.
     */
    PROD;
    
    companion object {
        fun fromString(value: String): Profile {
            return when (value.lowercase()) {
                "dev", "development" -> DEV
                "test", "testing" -> TEST
                "prod", "production" -> PROD
                else -> DEV // Default to development
            }
        }
    }
}