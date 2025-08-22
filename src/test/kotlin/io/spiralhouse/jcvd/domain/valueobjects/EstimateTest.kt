package io.spiralhouse.jcvd.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.comparables.shouldBeGreaterThan
import io.kotest.matchers.comparables.shouldBeLessThan
import io.kotest.matchers.string.shouldContain

/**
 * TDD Tests for Estimate Value Object - RED PHASE
 * 
 * These tests define the required behavior for Estimate value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 * 
 * Requirements being tested:
 * 1. Fibonacci sequence validation (1, 2, 3, 5, 8, 13)
 * 2. Null handling for non-estimable issues
 * 3. Comparison and arithmetic operations
 * 4. Validation and error handling
 */
class EstimateTest : DescribeSpec({
    
    describe("Estimate Value Object") {
        
        describe("creation and validation") {
            
            it("should accept valid Fibonacci values") {
                val validValues = listOf(1, 2, 3, 5, 8, 13)
                
                validValues.forEach { value ->
                    val estimate = Estimate(value)
                    estimate.value shouldBe value
                }
            }
            
            it("should accept null value for non-estimable issues") {
                val estimate = Estimate(null)
                
                estimate.value shouldBe null
                estimate.isNull() shouldBe true
                estimate.hasValue() shouldBe false
            }
            
            it("should reject non-Fibonacci values") {
                // Only test values that are NOT Fibonacci numbers at all
                val invalidValues = listOf(0, 4, 6, 7, 9, 10, 11, 12)
                
                invalidValues.forEach { value ->
                    shouldThrow<IllegalArgumentException> {
                        Estimate(value)
                    }.message shouldContain "must be a valid Fibonacci number"
                }
            }
            
            it("should reject negative values") {
                val negativeValues = listOf(-1, -2, -5, -10)
                
                negativeValues.forEach { value ->
                    shouldThrow<IllegalArgumentException> {
                        Estimate(value)
                    }.message shouldContain "cannot be negative"
                }
            }
            
            it("should reject values larger than maximum") {
                // Test both Fibonacci and non-Fibonacci values above maximum
                // All should be rejected as "not in valid set" 
                val largeValues = listOf(14, 15, 20, 21, 34, 55, 89, 100, 144)
                
                largeValues.forEach { value ->
                    shouldThrow<IllegalArgumentException> {
                        Estimate(value)
                    }.message shouldContain "must be a valid Fibonacci number"
                }
            }
        }
        
        describe("factory methods") {
            
            it("should create from valid values") {
                Estimate.of(1).value shouldBe 1
                Estimate.of(2).value shouldBe 2
                Estimate.of(3).value shouldBe 3
                Estimate.of(5).value shouldBe 5
                Estimate.of(8).value shouldBe 8
                Estimate.of(13).value shouldBe 13
            }
            
            it("should create none for non-estimable") {
                val none = Estimate.none()
                
                none.value shouldBe null
                none.isNull() shouldBe true
                none.hasValue() shouldBe false
            }
            
            it("should provide predefined constants") {
                Estimate.ONE.value shouldBe 1
                Estimate.TWO.value shouldBe 2
                Estimate.THREE.value shouldBe 3
                Estimate.FIVE.value shouldBe 5
                Estimate.EIGHT.value shouldBe 8
                Estimate.THIRTEEN.value shouldBe 13
                Estimate.NONE.value shouldBe null
            }
            
            it("should parse from string") {
                Estimate.fromString("1").value shouldBe 1
                Estimate.fromString("2").value shouldBe 2
                Estimate.fromString("3").value shouldBe 3
                Estimate.fromString("5").value shouldBe 5
                Estimate.fromString("8").value shouldBe 8
                Estimate.fromString("13").value shouldBe 13
                Estimate.fromString(null).value shouldBe null
                Estimate.fromString("").value shouldBe null
            }
            
            it("should reject invalid string values") {
                val invalidStrings = listOf("0", "4", "7", "14", "abc", "1.5", "infinity")
                
                invalidStrings.forEach { invalidString ->
                    shouldThrow<IllegalArgumentException> {
                        Estimate.fromString(invalidString)
                    }.message shouldContain "Invalid estimate value"
                }
            }
        }
        
        describe("Fibonacci sequence validation") {
            
            it("should validate all accepted Fibonacci numbers") {
                val fibonacciNumbers = listOf(1, 2, 3, 5, 8, 13)
                
                fibonacciNumbers.forEach { value ->
                    Estimate.isValidFibonacci(value) shouldBe true
                }
            }
            
            it("should reject non-Fibonacci numbers") {
                val nonFibonacci = listOf(0, 4, 6, 7, 9, 10, 11, 12, 14, 15)
                
                nonFibonacci.forEach { value ->
                    Estimate.isValidFibonacci(value) shouldBe false
                }
            }
            
            it("should get all valid Fibonacci values") {
                val validValues = Estimate.getValidValues()
                
                validValues shouldContainExactly listOf(1, 2, 3, 5, 8, 13)
            }
            
            it("should get next valid Fibonacci value") {
                Estimate.getNextValidValue(1) shouldBe 2
                Estimate.getNextValidValue(2) shouldBe 3
                Estimate.getNextValidValue(3) shouldBe 5
                Estimate.getNextValidValue(5) shouldBe 8
                Estimate.getNextValidValue(8) shouldBe 13
                Estimate.getNextValidValue(13) shouldBe null // No next value
            }
            
            it("should get previous valid Fibonacci value") {
                Estimate.getPreviousValidValue(13) shouldBe 8
                Estimate.getPreviousValidValue(8) shouldBe 5
                Estimate.getPreviousValidValue(5) shouldBe 3
                Estimate.getPreviousValidValue(3) shouldBe 2
                Estimate.getPreviousValidValue(2) shouldBe 1
                Estimate.getPreviousValidValue(1) shouldBe null // No previous value
            }
        }
        
        describe("properties and queries") {
            
            it("should identify null estimates") {
                Estimate.none().isNull() shouldBe true
                Estimate.none().hasValue() shouldBe false
                
                Estimate.of(5).isNull() shouldBe false
                Estimate.of(5).hasValue() shouldBe true
            }
            
            it("should identify small estimates") {
                Estimate.of(1).isSmall() shouldBe true
                Estimate.of(2).isSmall() shouldBe true
                Estimate.of(3).isSmall() shouldBe false
                Estimate.of(5).isSmall() shouldBe false
                Estimate.none().isSmall() shouldBe false
            }
            
            it("should identify large estimates") {
                Estimate.of(1).isLarge() shouldBe false
                Estimate.of(2).isLarge() shouldBe false
                Estimate.of(3).isLarge() shouldBe false
                Estimate.of(5).isLarge() shouldBe false
                Estimate.of(8).isLarge() shouldBe true
                Estimate.of(13).isLarge() shouldBe true
                Estimate.none().isLarge() shouldBe false
            }
            
            it("should identify complexity levels") {
                Estimate.of(1).getComplexity() shouldBe "Trivial"
                Estimate.of(2).getComplexity() shouldBe "Simple"
                Estimate.of(3).getComplexity() shouldBe "Moderate"
                Estimate.of(5).getComplexity() shouldBe "Complex"
                Estimate.of(8).getComplexity() shouldBe "Very Complex"
                Estimate.of(13).getComplexity() shouldBe "Extremely Complex"
                Estimate.none().getComplexity() shouldBe "Not Estimated"
            }
            
            it("should convert to display format") {
                Estimate.of(1).toDisplayString() shouldBe "1 point"
                Estimate.of(2).toDisplayString() shouldBe "2 points"
                Estimate.of(3).toDisplayString() shouldBe "3 points"
                Estimate.of(5).toDisplayString() shouldBe "5 points"
                Estimate.of(8).toDisplayString() shouldBe "8 points"
                Estimate.of(13).toDisplayString() shouldBe "13 points"
                Estimate.none().toDisplayString() shouldBe "Not estimated"
            }
        }
        
        describe("comparison operations") {
            
            it("should compare estimates correctly") {
                val small = Estimate.of(1)
                val medium = Estimate.of(5)
                val large = Estimate.of(13)
                val none = Estimate.none()
                
                // Value comparisons
                small shouldBeLessThan medium
                medium shouldBeLessThan large
                small shouldBeLessThan large
                
                // None comparisons (null is considered smallest)
                none shouldBeLessThan small
                none shouldBeLessThan medium
                none shouldBeLessThan large
            }
            
            it("should support equality") {
                val estimate1 = Estimate.of(5)
                val estimate2 = Estimate.of(5)
                val estimate3 = Estimate.of(8)
                
                estimate1 shouldBe estimate2
                estimate1 shouldNotBe estimate3
                estimate1.hashCode() shouldBe estimate2.hashCode()
                
                val none1 = Estimate.none()
                val none2 = Estimate.none()
                
                none1 shouldBe none2
                none1.hashCode() shouldBe none2.hashCode()
            }
            
            it("should support range queries") {
                val medium = Estimate.of(5)
                
                medium.isWithinRange(Estimate.of(3), Estimate.of(8)) shouldBe true
                medium.isWithinRange(Estimate.of(1), Estimate.of(3)) shouldBe false
                medium.isWithinRange(Estimate.of(8), Estimate.of(13)) shouldBe false
                
                // Range with none
                medium.isWithinRange(Estimate.none(), Estimate.of(8)) shouldBe true
                medium.isWithinRange(Estimate.of(8), Estimate.none()) shouldBe false
            }
        }
        
        describe("arithmetic operations") {
            
            it("should add estimates") {
                Estimate.of(1).plus(Estimate.of(2)) shouldBe Estimate.of(3)
                Estimate.of(2).plus(Estimate.of(3)) shouldBe Estimate.of(5)
                Estimate.of(3).plus(Estimate.of(5)) shouldBe Estimate.of(8)
                
                // Adding with none
                Estimate.of(5).plus(Estimate.none()) shouldBe Estimate.of(5)
                Estimate.none().plus(Estimate.of(5)) shouldBe Estimate.of(5)
                Estimate.none().plus(Estimate.none()) shouldBe Estimate.none()
            }
            
            it("should handle addition overflow") {
                // Adding estimates that exceed maximum should throw
                shouldThrow<IllegalArgumentException> {
                    Estimate.of(8).plus(Estimate.of(8))
                }.message shouldContain "would exceed maximum estimate"
            }
            
            it("should calculate sum of multiple estimates") {
                val estimates = listOf(
                    Estimate.of(1),
                    Estimate.of(2),
                    Estimate.of(3),
                    Estimate.none(),
                    Estimate.of(5)
                )
                
                val sum = Estimate.sum(estimates)
                sum.value shouldBe 11 // Non-Fibonacci result handled differently
            }
            
            it("should calculate average of estimates") {
                val estimates = listOf(
                    Estimate.of(2),
                    Estimate.of(3),
                    Estimate.of(5),
                    Estimate.none() // Should be ignored in average
                )
                
                val average = Estimate.average(estimates)
                average.value shouldBe 3 // (2+3+5)/3 ≈ 3
            }
        }
        
        describe("validation helpers") {
            
            it("should validate estimate requirements by issue type") {
                // Epic - no estimate allowed
                Estimate.isValidForType(Estimate.none(), IssueType.EPIC) shouldBe true
                Estimate.isValidForType(Estimate.of(5), IssueType.EPIC) shouldBe false
                
                // Story - estimate only if no subtasks
                Estimate.isValidForType(Estimate.none(), IssueType.STORY) shouldBe true
                Estimate.isValidForType(Estimate.of(5), IssueType.STORY) shouldBe true
                
                // Subtask - estimate required
                Estimate.isValidForType(Estimate.none(), IssueType.SUBTASK) shouldBe false
                Estimate.isValidForType(Estimate.of(5), IssueType.SUBTASK) shouldBe true
            }
            
            it("should suggest appropriate estimates") {
                val suggestions = Estimate.getSuggestions("simple task")
                suggestions shouldContainExactly listOf(Estimate.ONE, Estimate.TWO)
                
                val complexSuggestions = Estimate.getSuggestions("complex integration")
                complexSuggestions shouldContainExactly listOf(Estimate.FIVE, Estimate.EIGHT, Estimate.THIRTEEN)
            }
            
            it("should recommend decomposition for large estimates") {
                Estimate.of(1).shouldDecompose() shouldBe false
                Estimate.of(2).shouldDecompose() shouldBe false
                Estimate.of(3).shouldDecompose() shouldBe false
                Estimate.of(5).shouldDecompose() shouldBe false
                Estimate.of(8).shouldDecompose() shouldBe true
                Estimate.of(13).shouldDecompose() shouldBe true
            }
        }
        
        describe("string representation") {
            
            it("should have consistent toString") {
                Estimate.of(5).toString() shouldBe "5"
                Estimate.none().toString() shouldBe "null"
            }
            
            it("should support serialization") {
                val estimate = Estimate.of(8)
                val serialized = estimate.toString()
                val deserialized = Estimate.fromString(serialized)
                
                deserialized shouldBe estimate
            }
        }
        
        describe("edge cases") {
            
            it("should handle boundary values") {
                // Minimum valid estimate
                val min = Estimate.of(1)
                min.value shouldBe 1
                
                // Maximum valid estimate
                val max = Estimate.of(13)
                max.value shouldBe 13
                
                // Just outside boundaries should fail
                shouldThrow<IllegalArgumentException> {
                    Estimate.of(0)
                }
                
                shouldThrow<IllegalArgumentException> {
                    Estimate.of(14)
                }
            }
            
            it("should handle concurrent access") {
                val estimates = (1..100).map {
                    Estimate.of(5)
                }.toSet()
                
                // All estimates should be equal (same instance for same value)
                estimates.size shouldBe 1
            }
            
            it("should handle invalid arithmetic operations gracefully") {
                val max = Estimate.of(13)
                
                shouldThrow<IllegalArgumentException> {
                    max.plus(Estimate.of(1))
                }.message shouldContain "would exceed maximum"
            }
        }
    }
})