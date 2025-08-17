package com.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
@JvmInline
value class IssueId(val value: String) {
    init {
        require(value.isNotBlank()) { "IssueId cannot be empty" }
        require(value.length <= 100) { "IssueId cannot exceed 100 characters" }
    }
    
    companion object {
        fun generate(): IssueId = IssueId(UUID.randomUUID().toString())
        
        fun fromString(value: String): IssueId = IssueId(value)
    }
    
    override fun toString(): String = value
}