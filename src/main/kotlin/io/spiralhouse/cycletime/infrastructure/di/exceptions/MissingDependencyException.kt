package io.spiralhouse.cycletime.infrastructure.di.exceptions

import kotlin.reflect.KClass

/**
 * Exception thrown when a dependency is missing and cannot be resolved.
 * This is a more specific version of DependencyNotFoundException with additional context.
 */
class MissingDependencyException(
    val dependencyType: KClass<*>,
    val requestedBy: KClass<*>,
    message: String = "Missing dependency: ${dependencyType.simpleName ?: "Unknown"} required by ${requestedBy.simpleName ?: "Unknown"}"
) : RuntimeException(message)