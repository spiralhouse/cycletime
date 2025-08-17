package com.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

@Serializable
enum class IssueType(val value: String, val level: Int) {
    EPIC("epic", 1),
    STORY("story", 2),
    SUBTASK("subtask", 3);
    
    fun canBeChildOf(parentType: IssueType?): Boolean {
        return when (this) {
            EPIC -> parentType == null
            STORY -> parentType == EPIC
            SUBTASK -> parentType == STORY
        }
    }
    
    companion object {
        fun fromString(type: String): IssueType = when (type.lowercase()) {
            "epic" -> EPIC
            "story" -> STORY
            "subtask" -> SUBTASK
            else -> throw IllegalArgumentException("Unknown issue type: $type")
        }
    }
    
    override fun toString(): String = value
}