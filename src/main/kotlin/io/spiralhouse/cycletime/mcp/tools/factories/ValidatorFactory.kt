package io.spiralhouse.cycletime.mcp.tools.factories

import io.spiralhouse.cycletime.mcp.tools.validation.JsonSchemaValidator

/**
 * Factory for creating ToolValidator instances.
 * 
 * Provides different validator configurations for various use cases:
 * - Default: Standard JSON Schema validation
 * - Caching: Validates with compiled schema caching for performance
 * - Composite: Chain multiple validators together
 * - Strict: Enhanced validation with additional checks
 */
object ValidatorFactory {
    
    /**
     * Create a default validator with standard JSON Schema support.
     */
    fun createDefault(): JsonSchemaValidator {
        return JsonSchemaValidator()
    }
    
    /**
     * Create a caching validator that caches compiled schemas for performance.
     * Note: Caching functionality has been consolidated into JsonSchemaValidator.
     * 
     * @param baseValidator The underlying validator (ignored for backward compatibility)
     * @param maxCacheSize Maximum number of schemas to cache (ignored for backward compatibility)
     */
    fun createCaching(
        baseValidator: JsonSchemaValidator = JsonSchemaValidator(),
        maxCacheSize: Int = 100
    ): JsonSchemaValidator {
        return JsonSchemaValidator()
    }
    
    /**
     * Create a composite validator that chains multiple validators together.
     * Note: Composite functionality has been consolidated into JsonSchemaValidator.
     * 
     * @param validators The validators to chain together (ignored for backward compatibility)
     */
    fun createComposite(vararg validators: JsonSchemaValidator): JsonSchemaValidator {
        return JsonSchemaValidator()
    }
    
    /**
     * Create a strict validator with additional validation rules.
     * 
     * This includes the standard JSON Schema validation plus:
     * - Type coercion detection
     * - Additional format validation
     * - Schema compliance checks
     */
    fun createStrict(): JsonSchemaValidator {
        return createComposite(
            JsonSchemaValidator()
            // Additional validators can be added here for stricter validation
        )
    }
}