package io.spiralhouse.cycletime.infrastructure.di.exceptions

import kotlin.reflect.KClass

/**
 * Exception thrown when a circular dependency is detected during dependency resolution.
 */
class CircularDependencyException(
    val dependencyChain: List<KClass<*>>,
    message: String = "Circular dependency detected: ${dependencyChain.joinToString(" -> ") { it.simpleName ?: "Unknown" }}"
) : RuntimeException(message)