package io.spiralhouse.cycletime.infrastructure.config

/**
 * Dependency injection scopes for controlling instance lifecycle.
 */
enum class Scope {
    /**
     * Single instance shared across the entire application.
     */
    SINGLETON,
    
    /**
     * New instance created on each resolution.
     */
    FACTORY,
    
    /**
     * Instance scoped to a request (future implementation).
     */
    REQUEST
}