package io.spiralhouse.cycletime.mcp.tools.interfaces

import io.spiralhouse.cycletime.mcp.tools.validation.ValidationResult
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Interface for validating tool parameters against JSON schemas.
 * 
 * Implementations should support standard JSON Schema validation rules.
 */
interface ToolValidator {
    /**
     * Validate data against a JSON schema.
     * 
     * @param data The data to validate
     * @param schema The JSON schema to validate against
     * @return ValidationResult containing success status and any error messages
     */
    fun validate(data: JsonElement, schema: JsonObject): ValidationResult
}