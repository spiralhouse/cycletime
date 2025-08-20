package com.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
@JvmInline
value class SessionKey(val value: String) {
    init {
        require(value.isNotBlank()) { "SessionKey cannot be empty" }
        require(isValidFormat(value)) { "Invalid SessionKey format: $value" }
    }
    
    companion object {
        private val UUID_REGEX = Regex(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            RegexOption.IGNORE_CASE
        )
        
        fun generate(): SessionKey = SessionKey(UUID.randomUUID().toString())
        
        fun fromString(value: String): SessionKey = SessionKey(value)
        
        private fun isValidFormat(value: String): Boolean = UUID_REGEX.matches(value)
    }
    
    override fun toString(): String = value
}