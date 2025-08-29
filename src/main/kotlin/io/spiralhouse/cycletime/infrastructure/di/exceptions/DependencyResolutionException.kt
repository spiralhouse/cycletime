package io.spiralhouse.cycletime.infrastructure.di.exceptions

/**
 * Exception thrown when dependency resolution fails due to validation or compatibility issues.
 */
class DependencyResolutionException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)