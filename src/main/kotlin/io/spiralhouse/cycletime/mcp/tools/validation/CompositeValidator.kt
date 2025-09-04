package io.spiralhouse.cycletime.mcp.tools.validation

import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolValidator
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * A validator that chains multiple validators together.
 * 
 * All validators must pass for the validation to succeed. If any validator fails,
 * the validation fails with all collected error messages.
 * 
 * @param validators The list of validators to chain together
 */
class CompositeValidator(
    private val validators: List<ToolValidator>
) : ToolValidator {
    
    init {
        require(validators.isNotEmpty()) { "At least one validator must be provided" }
    }
    
    override fun validate(data: JsonElement, schema: JsonObject): ValidationResult {
        val allErrors = mutableListOf<String>()
        
        // Run all validators and collect errors
        for (validator in validators) {
            val result = validator.validate(data, schema)
            if (!result.isValid) {
                allErrors.addAll(result.errors)
            }
        }
        
        return if (allErrors.isEmpty()) {
            ValidationResult.success()
        } else {
            ValidationResult.failure(allErrors)
        }
    }
    
    /**
     * Create a new CompositeValidator by adding another validator.
     */
    fun and(validator: ToolValidator): CompositeValidator {
        return CompositeValidator(validators + validator)
    }
}