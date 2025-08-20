package io.spiralhouse.jcvd.domain.exceptions

open class DomainException(message: String, cause: Throwable? = null) : Exception(message, cause)

class InvalidSessionKeyException(key: String) : DomainException("Invalid session key format: $key")

class ProjectNotFoundException(id: String) : DomainException("Project not found: $id")

class IssueNotFoundException(id: String) : DomainException("Issue not found: $id")

class SessionNotFoundException(key: String) : DomainException("Session not found: $key")

class InvalidStateTransitionException(from: String, to: String) :
    DomainException("Invalid state transition from $from to $to")

class DependencyCycleException(message: String) : DomainException(message)

class ValidationException(message: String) : DomainException(message)
