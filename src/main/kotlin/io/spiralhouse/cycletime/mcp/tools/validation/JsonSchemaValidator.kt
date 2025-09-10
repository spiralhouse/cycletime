package io.spiralhouse.cycletime.mcp.tools.validation

import kotlinx.serialization.json.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Default JSON Schema validator implementation for tool parameters.
 * 
 * Supports the following JSON Schema validation features:
 * - Type validation (object, array, string, number, boolean)
 * - Required property validation for objects
 * - Nested object and array validation
 * - String constraints (minLength, maxLength)
 * - Number constraints (minimum, maximum)
 * - Array item type validation
 * 
 * This implementation provides clear error messages with path information
 * to help developers quickly identify validation issues.
 */
class JsonSchemaValidator {
    
    fun validate(data: JsonElement, schema: JsonObject): ValidationResult {
        val errors = mutableListOf<String>()
        
        try {
            validateElement(data, schema, "", errors)
        } catch (e: Exception) {
            errors.add("Validation error: ${e.message}")
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.success()
        } else {
            ValidationResult.failure(errors)
        }
    }
    
    private fun validateElement(
        data: JsonElement, 
        schema: JsonObject, 
        path: String, 
        errors: MutableList<String>
    ) {
        val type = schema["type"]?.jsonPrimitive?.content
        
        when (type) {
            "object" -> validateObject(data, schema, path, errors)
            "array" -> validateArray(data, schema, path, errors)
            "string" -> validateString(data, schema, path, errors)
            "number" -> validateNumber(data, schema, path, errors)
            "boolean" -> validateBoolean(data, path, errors)
            else -> {
                // If no type specified, try to validate as object
                if (schema.containsKey("properties")) {
                    validateObject(data, schema, path, errors)
                }
            }
        }
    }
    
    private fun validateObject(
        data: JsonElement, 
        schema: JsonObject, 
        path: String, 
        errors: MutableList<String>
    ) {
        if (data !is JsonObject) {
            errors.add("${if (path.isEmpty()) "root" else path} must be an object")
            return
        }
        
        // Check required properties
        val required = schema["required"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
        for (requiredField in required) {
            if (!data.containsKey(requiredField)) {
                errors.add("${if (path.isEmpty()) "" else "$path."}$requiredField is required")
            }
        }
        
        // Validate properties
        val properties = schema["properties"]?.jsonObject
        if (properties != null) {
            for ((key, value) in data) {
                val propertySchema = properties[key]?.jsonObject
                if (propertySchema != null) {
                    val fieldPath = if (path.isEmpty()) key else "$path.$key"
                    validateElement(value, propertySchema, fieldPath, errors)
                }
            }
        }
    }
    
    private fun validateArray(
        data: JsonElement, 
        schema: JsonObject, 
        path: String, 
        errors: MutableList<String>
    ) {
        if (data !is JsonArray) {
            errors.add("${if (path.isEmpty()) "root" else path} must be an array")
            return
        }
        
        val itemsSchema = schema["items"]?.jsonObject
        if (itemsSchema != null) {
            data.forEachIndexed { index, item ->
                val itemPath = "$path[$index]"
                validateElement(item, itemsSchema, itemPath, errors)
            }
        }
    }
    
    private fun validateString(
        data: JsonElement, 
        schema: JsonObject, 
        path: String, 
        errors: MutableList<String>
    ) {
        if (data !is JsonPrimitive || !data.isString) {
            val message = if (path.contains("[")) {
                // If we're validating an array item, mention it in the error
                "${if (path.isEmpty()) "root" else path} must be a string (array item validation)"
            } else {
                "${if (path.isEmpty()) "root" else path} must be a string"
            }
            errors.add(message)
            return
        }
        
        val value = data.content
        
        // Check minLength
        val minLength = schema["minLength"]?.jsonPrimitive?.intOrNull
        if (minLength != null && value.length < minLength) {
            errors.add("${if (path.isEmpty()) "root" else path} must be at least $minLength characters (minLength)")
        }
        
        // Check maxLength
        val maxLength = schema["maxLength"]?.jsonPrimitive?.intOrNull
        if (maxLength != null && value.length > maxLength) {
            errors.add("${if (path.isEmpty()) "root" else path} must be at most $maxLength characters")
        }
    }
    
    private fun validateNumber(
        data: JsonElement, 
        schema: JsonObject, 
        path: String, 
        errors: MutableList<String>
    ) {
        // Check if it's a valid number
        val value = try {
            when {
                data is JsonPrimitive && data.doubleOrNull != null -> data.double
                data is JsonPrimitive && data.intOrNull != null -> data.int.toDouble()
                else -> {
                    errors.add("${if (path.isEmpty()) "root" else path} must be a number")
                    return
                }
            }
        } catch (e: Exception) {
            errors.add("${if (path.isEmpty()) "root" else path} must be a number")
            return
        }
        
        // Check minimum
        val minimum = schema["minimum"]?.jsonPrimitive?.doubleOrNull
        if (minimum != null && value < minimum) {
            errors.add("${if (path.isEmpty()) "root" else path} must be at least $minimum (minimum)")
        }
        
        // Check maximum
        val maximum = schema["maximum"]?.jsonPrimitive?.doubleOrNull
        if (maximum != null && value > maximum) {
            errors.add("${if (path.isEmpty()) "root" else path} must be at most $maximum")
        }
    }
    
    private fun validateBoolean(
        data: JsonElement, 
        path: String, 
        errors: MutableList<String>
    ) {
        if (data !is JsonPrimitive) {
            errors.add("${if (path.isEmpty()) "root" else path} must be a boolean")
            return
        }
        
        try {
            data.boolean
        } catch (e: Exception) {
            errors.add("${if (path.isEmpty()) "root" else path} must be a boolean")
        }
    }
}
