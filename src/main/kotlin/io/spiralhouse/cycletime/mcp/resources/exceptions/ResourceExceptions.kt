package io.spiralhouse.cycletime.mcp.resources.exceptions

/**
 * Exception thrown when a resource URI format is invalid
 */
class InvalidResourceUriException(message: String) : Exception(message)

/**
 * Exception thrown when a resource is not found
 */
class ResourceNotFoundException(uri: String) : Exception("Resource not found: $uri")

/**
 * Exception thrown when a provider is unavailable
 */
class ProviderUnavailableException(provider: String) : Exception("Provider unavailable: $provider")

/**
 * Exception thrown when subscription limit is exceeded
 */
class SubscriptionLimitExceededException(limit: Int) : Exception("Subscription limit exceeded: $limit")

/**
 * Exception thrown when content encoding is invalid
 */
class ContentEncodingException(message: String) : Exception(message)

/**
 * Exception thrown when a provider is not found in the registry
 */
class ProviderNotFoundException(key: String) : Exception("Provider not found: $key")