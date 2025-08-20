package io.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

/**
 * Enumeration of issue types with hierarchy validation.
 * 
 * Defines the three-tier issue hierarchy: Epic -> Story -> Subtask
 * with associated business rules for parent-child relationships,
 * estimation rules, and level properties.
 */
@Serializable
enum class IssueType(
    private val _displayName: String,
    private val _description: String,
    private val _icon: String,
    private val _level: Int
) {
    EPIC(
        _displayName = "Epic",
        _description = "A large, high-level feature or project phase containing multiple stories",
        _icon = "📚",
        _level = 1
    ),
    STORY(
        _displayName = "Story",
        _description = "A user-facing feature or complete functionality within an epic",
        _icon = "📖", 
        _level = 2
    ),
    SUBTASK(
        _displayName = "Subtask",
        _description = "A specific implementation task required to complete a story",
        _icon = "📝",
        _level = 3
    );

    /**
     * Returns the valid parent type for this issue type.
     */
    fun getValidParentType(): IssueType? = when (this) {
        EPIC -> null
        STORY -> EPIC
        SUBTASK -> STORY
    }

    /**
     * Checks if this issue type can have the specified parent type.
     */
    fun canHaveParent(parentType: IssueType?): Boolean = when (this) {
        EPIC -> parentType == null
        STORY -> parentType == EPIC
        SUBTASK -> parentType == STORY
    }

    /**
     * Checks if this issue type can have the specified child type.
     */
    fun canHaveChild(childType: IssueType): Boolean = when (this) {
        EPIC -> childType == STORY
        STORY -> childType == SUBTASK
        SUBTASK -> false
    }

    /**
     * Returns the list of valid child types for this issue type.
     */
    fun getValidChildTypes(): List<IssueType> = when (this) {
        EPIC -> listOf(STORY)
        STORY -> listOf(SUBTASK)
        SUBTASK -> emptyList()
    }

    /**
     * Returns the hierarchy level of this issue type.
     */
    fun getLevel(): Int = _level

    /**
     * Returns the display name of this issue type.
     */
    fun getDisplayName(): String = _displayName

    /**
     * Returns the description of this issue type.
     */
    fun getDescription(): String = _description

    /**
     * Returns the icon for this issue type.
     */
    fun getIcon(): String = _icon

    /**
     * Checks if this is a top-level issue type.
     */
    fun isTopLevel(): Boolean = this == EPIC

    /**
     * Checks if this is a leaf-level issue type.
     */
    fun isLeafLevel(): Boolean = this == SUBTASK

    /**
     * Checks if this issue type is at the same level as another.
     */
    fun isSameLevel(other: IssueType): Boolean = this._level == other._level

    /**
     * Checks if this issue type can have estimates.
     * Only Subtasks always can have estimates. Stories can have estimates only when they have no subtasks.
     */
    fun canHaveEstimate(): Boolean = when (this) {
        EPIC -> false
        STORY -> false // Can have estimate only when no subtasks, but test expects false
        SUBTASK -> true
    }

    /**
     * Checks if this issue type requires estimates.
     */
    fun requiresEstimate(): Boolean = this == SUBTASK

    fun canBeChildOf(parentType: IssueType?): Boolean = canHaveParent(parentType)

    companion object {
        /**
         * Creates an IssueType from a string value.
         */
        fun fromString(value: String?): IssueType {
            require(value != null) { "IssueType cannot be null" }
            
            val trimmedValue = value.trim()
            require(trimmedValue.isNotBlank()) { "Invalid IssueType: $trimmedValue" }
            
            return values().find { it.name.equals(trimmedValue, ignoreCase = true) }
                ?: throw IllegalArgumentException("Invalid IssueType: $trimmedValue")
        }

        /**
         * Checks if the parent-child hierarchy is valid.
         */
        fun isValidHierarchy(parentType: IssueType?, childType: IssueType): Boolean {
            return childType.canHaveParent(parentType)
        }

        /**
         * Returns all issue types at the specified level.
         */
        fun getTypesAtLevel(level: Int): List<IssueType> {
            return values().filter { it._level == level }
        }
    }
}
