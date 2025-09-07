package io.spiralhouse.cycletime.mcp.tools.validation

/**
 * Result of parameter validation against JSON Schema.
 */
data class ValidationResult(
    val isValid: Boolean,
    val errors: List<String> = emptyList()
) {
    companion object {
        fun success(): ValidationResult = ValidationResult(true)
        
        fun failure(errors: List<String>): ValidationResult = 
            ValidationResult(false, errors)
        
        fun failure(error: String): ValidationResult = 
            ValidationResult(false, listOf(error))
    }
}