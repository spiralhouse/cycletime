package io.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable

/**
 * Value object representing an estimate in Fibonacci sequence.
 * 
 * Enforces Fibonacci number validation (1, 2, 3, 5, 8, 13) and provides
 * factory methods, arithmetic operations, and business logic for estimates.
 */
@Serializable
open class Estimate constructor(val value: Int?, private val validateFibonacci: Boolean = true) : Comparable<Estimate> {

    init {
        if (value != null) {
            require(value >= 0) { "Estimate cannot be negative" }
            if (validateFibonacci) {
                // Simple validation: value must be in our allowed set
                require(isValidFibonacci(value)) { 
                    "Estimate must be a valid Fibonacci number: 1, 2, 3, 5, 8, 13" 
                }
            }
        }
    }

    /**
     * Checks if this estimate is null (no estimate).
     */
    fun isNull(): Boolean = value == null

    /**
     * Checks if this estimate has a value.
     */
    fun hasValue(): Boolean = value != null

    /**
     * Checks if this estimate is considered small (1-2 points).
     */
    fun isSmall(): Boolean = value != null && value <= 2

    /**
     * Checks if this estimate is considered large (8+ points).
     */
    fun isLarge(): Boolean = value != null && value >= 8

    /**
     * Gets the complexity description for this estimate.
     */
    fun getComplexity(): String = when (value) {
        null -> "Not Estimated"
        1 -> "Trivial"
        2 -> "Simple"
        3 -> "Moderate"
        5 -> "Complex"
        8 -> "Very Complex"
        13 -> "Extremely Complex"
        else -> "Unknown"
    }

    /**
     * Converts this estimate to a display string.
     */
    fun toDisplayString(): String = when (value) {
        null -> "Not estimated"
        1 -> "1 point"
        else -> "$value points"
    }

    /**
     * Checks if this estimate is within the specified range.
     */
    fun isWithinRange(min: Estimate, max: Estimate): Boolean {
        val thisValue = value ?: return min.value == null
        val minValue = min.value ?: Int.MIN_VALUE
        val maxValue = max.value ?: return false
        return thisValue >= minValue && thisValue <= maxValue
    }

    /**
     * Adds another estimate to this one.
     */
    fun plus(other: Estimate): Estimate {
        if (value == null) return other
        if (other.value == null) return this
        
        val sum = value + other.value
        require(sum <= MAX_ESTIMATE) { "Addition would exceed maximum estimate of $MAX_ESTIMATE" }
        
        // For addition results, we allow non-Fibonacci values
        return createRaw(sum)
    }

    /**
     * Recommends if this estimate should be decomposed into smaller tasks.
     */
    fun shouldDecompose(): Boolean = value != null && value >= 8

    override fun compareTo(other: Estimate): Int {
        return when {
            value == null && other.value == null -> 0
            value == null -> -1
            other.value == null -> 1
            else -> value.compareTo(other.value)
        }
    }

    override fun toString(): String = value?.toString() ?: "null"

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Estimate) return false
        return value == other.value
    }

    override fun hashCode(): Int = value?.hashCode() ?: 0

    companion object {
        private const val MAX_ESTIMATE = 13
        private val VALID_FIBONACCI = listOf(1, 2, 3, 5, 8, 13)
        
        // Predefined constants
        val ONE = Estimate(1, true)
        val TWO = Estimate(2, true)
        val THREE = Estimate(3, true)
        val FIVE = Estimate(5, true)
        val EIGHT = Estimate(8, true)
        val THIRTEEN = Estimate(13, true)
        val NONE = Estimate(null, true)

        /**
         * Creates an estimate with the specified value.
         */
        fun of(value: Int): Estimate = Estimate(value, true)

        /**
         * Creates a null estimate (no estimate).
         */
        fun none(): Estimate = NONE

        /**
         * Creates an estimate from a string.
         */
        fun fromString(value: String?): Estimate {
            if (value.isNullOrBlank()) return none()
            
            val intValue = value.toIntOrNull() ?: throw IllegalArgumentException("Invalid estimate value: $value")
            
            // Validate the parsed integer value
            return try {
                of(intValue)
            } catch (e: IllegalArgumentException) {
                // Re-throw with a more specific message for string parsing
                throw IllegalArgumentException("Invalid estimate value: $value")
            }
        }

        /**
         * Checks if the specified value is a valid Fibonacci number.
         */
        fun isValidFibonacci(value: Int): Boolean = value in VALID_FIBONACCI

        /**
         * Returns all valid Fibonacci values.
         */
        fun getValidValues(): List<Int> = VALID_FIBONACCI.toList()

        /**
         * Gets the next valid Fibonacci value after the specified value.
         */
        fun getNextValidValue(value: Int): Int? {
            val index = VALID_FIBONACCI.indexOf(value)
            return if (index >= 0 && index < VALID_FIBONACCI.size - 1) VALID_FIBONACCI[index + 1] else null
        }

        /**
         * Gets the previous valid Fibonacci value before the specified value.
         */
        fun getPreviousValidValue(value: Int): Int? {
            val index = VALID_FIBONACCI.indexOf(value)
            return if (index > 0) VALID_FIBONACCI[index - 1] else null
        }

        /**
         * Calculates the sum of multiple estimates.
         */
        fun sum(estimates: List<Estimate>): Estimate {
            val total = estimates.mapNotNull { it.value }.sum()
            return createRaw(total)
        }

        /**
         * Calculates the average of multiple estimates, ignoring null values.
         */
        fun average(estimates: List<Estimate>): Estimate {
            val validEstimates = estimates.mapNotNull { it.value }
            if (validEstimates.isEmpty()) return none()
            
            val avg = validEstimates.average().toInt()
            // Find closest valid Fibonacci number
            val closestFib = VALID_FIBONACCI.minByOrNull { kotlin.math.abs(it - avg) } ?: return none()
            return of(closestFib)
        }

        /**
         * Checks if an estimate is valid for the specified issue type.
         */
        fun isValidForType(estimate: Estimate, issueType: IssueType): Boolean = when (issueType) {
            IssueType.EPIC -> estimate.value == null
            IssueType.STORY -> true // Can have estimate or not
            IssueType.SUBTASK -> estimate.value != null
        }

        /**
         * Gets estimate suggestions based on task description.
         */
        fun getSuggestions(description: String): List<Estimate> {
            val lowerDesc = description.lowercase()
            return when {
                "simple" in lowerDesc || "trivial" in lowerDesc -> listOf(ONE, TWO)
                "complex" in lowerDesc || "integration" in lowerDesc -> listOf(FIVE, EIGHT, THIRTEEN)
                else -> listOf(THREE, FIVE)
            }
        }

        /**
         * Creates an estimate that bypasses Fibonacci validation.
         * Used for arithmetic operations that may result in non-Fibonacci values.
         */
        internal fun createRaw(value: Int?): Estimate {
            return Estimate(value, false)
        }
    }

}