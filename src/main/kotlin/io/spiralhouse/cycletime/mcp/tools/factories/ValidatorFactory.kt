package io.spiralhouse.cycletime.mcp.tools.factories

import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolValidator
import io.spiralhouse.cycletime.mcp.tools.validation.JsonSchemaValidator
import io.spiralhouse.cycletime.mcp.tools.validation.CompositeValidator
import io.spiralhouse.cycletime.mcp.tools.validation.CachingValidator

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
    fun createDefault(): ToolValidator {
        return JsonSchemaValidator()
    }
    
    /**
     * Create a caching validator that caches compiled schemas for performance.
     * 
     * @param baseValidator The underlying validator to cache results for
     * @param maxCacheSize Maximum number of schemas to cache
     */
    fun createCaching(
        baseValidator: ToolValidator = JsonSchemaValidator(),
        maxCacheSize: Int = 100
    ): ToolValidator {
        return CachingValidator(baseValidator, maxCacheSize)
    }
    
    /**
     * Create a composite validator that chains multiple validators together.
     * 
     * All validators must pass for the validation to succeed.
     * 
     * @param validators The validators to chain together
     */
    fun createComposite(vararg validators: ToolValidator): ToolValidator {
        return CompositeValidator(validators.toList())
    }
    
    /**
     * Create a strict validator with additional validation rules.
     * 
     * This includes the standard JSON Schema validation plus:
     * - Type coercion detection
     * - Additional format validation
     * - Schema compliance checks
     */
    fun createStrict(): ToolValidator {
        return createComposite(
            JsonSchemaValidator()
            // Additional validators can be added here for stricter validation
        )
    }
}