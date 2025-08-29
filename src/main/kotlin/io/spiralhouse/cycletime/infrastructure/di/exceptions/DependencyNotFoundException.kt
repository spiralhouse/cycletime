package io.spiralhouse.cycletime.infrastructure.di.exceptions

import kotlin.reflect.KClass

/**
 * Exception thrown when a required dependency cannot be found.
 */
class DependencyNotFoundException(
    val dependencyType: KClass<*>,
    val requestedBy: KClass<*>? = null,
    message: String = "Dependency not found: ${dependencyType.simpleName}" + 
                    (requestedBy?.let { " (requested by ${it.simpleName})" } ?: "")
) : RuntimeException(message)