package io.spiralhouse.jcvd.application.exceptions

import io.spiralhouse.jcvd.domain.valueobjects.ProjectId

/**
 * Base exception for application-layer errors.
 */
abstract class ApplicationException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Exception thrown when a project is not found.
 */
class ProjectNotFoundException(id: ProjectId) : ApplicationException("Project with ID ${id.value} not found")

/**
 * Exception thrown when validation fails at the application layer.
 */
class ValidationException(message: String) : ApplicationException(message)

/**
 * Exception thrown when a business rule is violated at the application layer.
 */
class BusinessRuleViolationException(message: String) : ApplicationException(message)