---
title: "Error Handling Example - Authentication with Edge Cases"
type: example
domain: [development, quality]
description: "Demonstrates comprehensive error handling with edge case coverage"
dependencies: [../../reference/definition-of-done.md]
related: [../../concepts/architecture/error-handling.md]
keywords: [dod, example, error-handling, edge-cases, validation]
last_updated: 2025-10-21
---

# Error Handling Example - Authentication with Edge Cases

## Context

This example demonstrates proper error handling that covers all edge cases and provides clear error messages without exposing security vulnerabilities.

## PASS Example

```kotlin
/**
 * Authenticates user credentials with comprehensive error handling.
 * Returns Result type to make error handling explicit.
 */
fun authenticate(credentials: Credentials): Result<User> {
    return when {
        credentials.isEmpty() -> {
            Result.failure(InvalidCredentialsException("Credentials cannot be empty"))
        }
        !credentials.isValid() -> {
            Result.failure(InvalidFormatException("Invalid credential format"))
        }
        else -> {
            repository.findUser(credentials)
                .mapCatching { user ->
                    user.validatePassword(credentials.password)
                }
                .getOrElse {
                    Result.failure(AuthenticationFailedException("Authentication failed"))
                }
        }
    }
}
```

### Security-Conscious Error Handling

```kotlin
/**
 * Handles authentication errors without leaking information.
 * Returns generic messages to prevent user enumeration attacks.
 */
sealed class AuthenticationException(message: String) : Exception(message)

class InvalidCredentialsException(message: String = "Invalid credentials")
    : AuthenticationException(message)

class InvalidFormatException(message: String = "Invalid format")
    : AuthenticationException(message)

class AuthenticationFailedException(message: String = "Authentication failed")
    : AuthenticationException(message)
```

### Environment Variable Configuration

```kotlin
/**
 * Loads API configuration from environment variables.
 * Fails fast on missing required configuration.
 */
fun loadApiConfiguration(): ApiConfig {
    val apiKey = System.getenv("CYCLETIME_API_KEY")
        ?: throw ConfigurationException("API key required in CYCLETIME_API_KEY")

    val apiUrl = System.getenv("CYCLETIME_API_URL")
        ?: "https://api.cycletime.dev" // Sensible default

    return ApiConfig(apiKey, apiUrl)
}
```

### SQL Injection Prevention

```kotlin
/**
 * Finds user by email using parameterized query.
 * Safe from SQL injection attacks.
 */
fun findUser(email: String): User? {
    return transaction {
        Users.select { Users.email eq email }
            .singleOrNull()
            ?.let { resultRow ->
                User(
                    id = resultRow[Users.id],
                    email = resultRow[Users.email]
                )
            }
    }
}
```

## Explanation

**Why This Passes DoD:**
- All edge cases handled (empty, invalid format, not found)
- Returns Result type for explicit error handling
- No secrets in code (environment variables)
- Security-conscious error messages (no user enumeration)
- SQL injection prevention (parameterized queries)
- Fails fast on misconfiguration

## Related DoD Criteria

- Section 1.1: Functionality Complete - Edge cases handled appropriately
- Section 3.3: Security Review - No secrets, SQL injection prevention
- Section 1.2: Code Quality - No hardcoded values, proper error handling
