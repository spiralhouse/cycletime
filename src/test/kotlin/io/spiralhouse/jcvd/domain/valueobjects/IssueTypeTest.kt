package io.spiralhouse.jcvd.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.string.shouldContain

/**
 * TDD Tests for IssueType Value Object - RED PHASE
 * 
 * These tests define the required behavior for IssueType enum following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 * 
 * Requirements being tested:
 * 1. Enum values (EPIC, STORY, SUBTASK)
 * 2. String representation and parsing
 * 3. Hierarchy validation helpers
 * 4. Serialization support
 */
class IssueTypeTest : DescribeSpec({
    
    describe("IssueType Enum") {
        
        describe("enum values") {
            
            it("should have EPIC value") {
                val epic = IssueType.EPIC
                
                epic.name shouldBe "EPIC"
                epic.toString() shouldBe "EPIC"
            }
            
            it("should have STORY value") {
                val story = IssueType.STORY
                
                story.name shouldBe "STORY"
                story.toString() shouldBe "STORY"
            }
            
            it("should have SUBTASK value") {
                val subtask = IssueType.SUBTASK
                
                subtask.name shouldBe "SUBTASK"
                subtask.toString() shouldBe "SUBTASK"
            }
            
            it("should have exactly three values") {
                val allValues = IssueType.values()
                
                allValues shouldHaveSize 3
                allValues shouldContain IssueType.EPIC
                allValues shouldContain IssueType.STORY
                allValues shouldContain IssueType.SUBTASK
            }
            
            it("should maintain enum ordering") {
                val allValues = IssueType.values()
                
                allValues[0] shouldBe IssueType.EPIC
                allValues[1] shouldBe IssueType.STORY
                allValues[2] shouldBe IssueType.SUBTASK
            }
        }
        
        describe("hierarchy validation") {
            
            it("should validate Epic has no parent") {
                IssueType.EPIC.getValidParentType() shouldBe null
            }
            
            it("should validate Story has Epic parent") {
                IssueType.STORY.getValidParentType() shouldBe IssueType.EPIC
            }
            
            it("should validate Subtask has Story parent") {
                IssueType.SUBTASK.getValidParentType() shouldBe IssueType.STORY
            }
            
            it("should validate parent relationships") {
                // Epic can have no parent
                IssueType.EPIC.canHaveParent(null) shouldBe true
                IssueType.EPIC.canHaveParent(IssueType.EPIC) shouldBe false
                IssueType.EPIC.canHaveParent(IssueType.STORY) shouldBe false
                IssueType.EPIC.canHaveParent(IssueType.SUBTASK) shouldBe false
                
                // Story can only have Epic parent
                IssueType.STORY.canHaveParent(null) shouldBe false
                IssueType.STORY.canHaveParent(IssueType.EPIC) shouldBe true
                IssueType.STORY.canHaveParent(IssueType.STORY) shouldBe false
                IssueType.STORY.canHaveParent(IssueType.SUBTASK) shouldBe false
                
                // Subtask can only have Story parent
                IssueType.SUBTASK.canHaveParent(null) shouldBe false
                IssueType.SUBTASK.canHaveParent(IssueType.EPIC) shouldBe false
                IssueType.SUBTASK.canHaveParent(IssueType.STORY) shouldBe true
                IssueType.SUBTASK.canHaveParent(IssueType.SUBTASK) shouldBe false
            }
            
            it("should validate child relationships") {
                // Epic can have Stories as children
                IssueType.EPIC.canHaveChild(IssueType.STORY) shouldBe true
                IssueType.EPIC.canHaveChild(IssueType.EPIC) shouldBe false
                IssueType.EPIC.canHaveChild(IssueType.SUBTASK) shouldBe false
                
                // Story can have Subtasks as children
                IssueType.STORY.canHaveChild(IssueType.SUBTASK) shouldBe true
                IssueType.STORY.canHaveChild(IssueType.EPIC) shouldBe false
                IssueType.STORY.canHaveChild(IssueType.STORY) shouldBe false
                
                // Subtask cannot have children
                IssueType.SUBTASK.canHaveChild(IssueType.EPIC) shouldBe false
                IssueType.SUBTASK.canHaveChild(IssueType.STORY) shouldBe false
                IssueType.SUBTASK.canHaveChild(IssueType.SUBTASK) shouldBe false
            }
            
            it("should get valid child types") {
                IssueType.EPIC.getValidChildTypes() shouldBe listOf(IssueType.STORY)
                IssueType.STORY.getValidChildTypes() shouldBe listOf(IssueType.SUBTASK)
                IssueType.SUBTASK.getValidChildTypes() shouldBe emptyList()
            }
        }
        
        describe("level properties") {
            
            it("should have correct hierarchy levels") {
                IssueType.EPIC.getLevel() shouldBe 1
                IssueType.STORY.getLevel() shouldBe 2
                IssueType.SUBTASK.getLevel() shouldBe 3
            }
            
            it("should validate level hierarchy") {
                IssueType.EPIC.isTopLevel() shouldBe true
                IssueType.STORY.isTopLevel() shouldBe false
                IssueType.SUBTASK.isTopLevel() shouldBe false
                
                IssueType.EPIC.isLeafLevel() shouldBe false
                IssueType.STORY.isLeafLevel() shouldBe false
                IssueType.SUBTASK.isLeafLevel() shouldBe true
            }
            
            it("should check if types are at same level") {
                IssueType.EPIC.isSameLevel(IssueType.EPIC) shouldBe true
                IssueType.EPIC.isSameLevel(IssueType.STORY) shouldBe false
                
                IssueType.STORY.isSameLevel(IssueType.STORY) shouldBe true
                IssueType.STORY.isSameLevel(IssueType.SUBTASK) shouldBe false
                
                IssueType.SUBTASK.isSameLevel(IssueType.SUBTASK) shouldBe true
                IssueType.SUBTASK.isSameLevel(IssueType.EPIC) shouldBe false
            }
        }
        
        describe("string parsing") {
            
            it("should parse from string (case-insensitive)") {
                IssueType.fromString("EPIC") shouldBe IssueType.EPIC
                IssueType.fromString("epic") shouldBe IssueType.EPIC
                IssueType.fromString("Epic") shouldBe IssueType.EPIC
                
                IssueType.fromString("STORY") shouldBe IssueType.STORY
                IssueType.fromString("story") shouldBe IssueType.STORY
                IssueType.fromString("Story") shouldBe IssueType.STORY
                
                IssueType.fromString("SUBTASK") shouldBe IssueType.SUBTASK
                IssueType.fromString("subtask") shouldBe IssueType.SUBTASK
                IssueType.fromString("Subtask") shouldBe IssueType.SUBTASK
            }
            
            it("should reject invalid string values") {
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString("INVALID")
                }.message shouldContain "Invalid IssueType"
                
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString("task")
                }.message shouldContain "Invalid IssueType"
                
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString("")
                }.message shouldContain "Invalid IssueType"
            }
            
            it("should reject null input") {
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString(null as String?)
                }.message shouldContain "cannot be null"
            }
            
            it("should handle whitespace in input") {
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString("  EPIC  ")
                }.message shouldContain "Invalid IssueType"
                
                shouldThrow<IllegalArgumentException> {
                    IssueType.fromString("   ")
                }.message shouldContain "Invalid IssueType"
            }
        }
        
        describe("display properties") {
            
            it("should have display names") {
                IssueType.EPIC.getDisplayName() shouldBe "Epic"
                IssueType.STORY.getDisplayName() shouldBe "Story"
                IssueType.SUBTASK.getDisplayName() shouldBe "Subtask"
            }
            
            it("should have descriptions") {
                IssueType.EPIC.getDescription() shouldContain "high-level"
                IssueType.STORY.getDescription() shouldContain "user-facing"
                IssueType.SUBTASK.getDescription() shouldContain "implementation"
            }
            
            it("should have icons or symbols") {
                IssueType.EPIC.getIcon() shouldBe "📚"
                IssueType.STORY.getIcon() shouldBe "📖"
                IssueType.SUBTASK.getIcon() shouldBe "📝"
            }
        }
        
        describe("estimation properties") {
            
            it("should define which types can have estimates") {
                IssueType.EPIC.canHaveEstimate() shouldBe false
                IssueType.STORY.canHaveEstimate() shouldBe false // Only when no subtasks
                IssueType.SUBTASK.canHaveEstimate() shouldBe true
            }
            
            it("should define estimation requirements") {
                IssueType.EPIC.requiresEstimate() shouldBe false
                IssueType.STORY.requiresEstimate() shouldBe false
                IssueType.SUBTASK.requiresEstimate() shouldBe true
            }
        }
        
        describe("equality and comparison") {
            
            it("should support equality comparison") {
                val epic1 = IssueType.EPIC
                val epic2 = IssueType.EPIC
                val story = IssueType.STORY
                
                epic1 shouldBe epic2
                epic1 shouldNotBe story
                epic1.hashCode() shouldBe epic2.hashCode()
            }
            
            it("should support ordinal comparison") {
                IssueType.EPIC.ordinal shouldBe 0
                IssueType.STORY.ordinal shouldBe 1
                IssueType.SUBTASK.ordinal shouldBe 2
                
                // Should be ordered by hierarchy level
                (IssueType.EPIC.ordinal < IssueType.STORY.ordinal) shouldBe true
                (IssueType.STORY.ordinal < IssueType.SUBTASK.ordinal) shouldBe true
            }
        }
        
        describe("serialization") {
            
            it("should serialize to string consistently") {
                val epic = IssueType.EPIC
                
                epic.toString() shouldBe "EPIC"
                epic.name shouldBe "EPIC"
            }
            
            it("should support valueOf for deserialization") {
                IssueType.valueOf("EPIC") shouldBe IssueType.EPIC
                IssueType.valueOf("STORY") shouldBe IssueType.STORY
                IssueType.valueOf("SUBTASK") shouldBe IssueType.SUBTASK
            }
            
            it("should reject invalid valueOf input") {
                shouldThrow<IllegalArgumentException> {
                    IssueType.valueOf("INVALID")
                }
                
                shouldThrow<IllegalArgumentException> {
                    IssueType.valueOf("epic") // Case sensitive
                }
            }
        }
        
        describe("validation helpers") {
            
            it("should validate issue type hierarchy in batch") {
                val validHierarchies = listOf(
                    null to IssueType.EPIC,
                    IssueType.EPIC to IssueType.STORY,
                    IssueType.STORY to IssueType.SUBTASK
                )
                
                validHierarchies.forEach { (parent, child) ->
                    IssueType.isValidHierarchy(parent, child) shouldBe true
                }
            }
            
            it("should reject invalid hierarchies") {
                val invalidHierarchies = listOf(
                    IssueType.EPIC to IssueType.EPIC,
                    IssueType.EPIC to IssueType.SUBTASK,
                    IssueType.STORY to IssueType.EPIC,
                    IssueType.STORY to IssueType.STORY,
                    IssueType.SUBTASK to IssueType.EPIC,
                    IssueType.SUBTASK to IssueType.STORY,
                    IssueType.SUBTASK to IssueType.SUBTASK,
                    null to IssueType.STORY,
                    null to IssueType.SUBTASK
                )
                
                invalidHierarchies.forEach { (parent, child) ->
                    IssueType.isValidHierarchy(parent, child) shouldBe false
                }
            }
            
            it("should get all valid types for level") {
                IssueType.getTypesAtLevel(1) shouldBe listOf(IssueType.EPIC)
                IssueType.getTypesAtLevel(2) shouldBe listOf(IssueType.STORY)
                IssueType.getTypesAtLevel(3) shouldBe listOf(IssueType.SUBTASK)
                IssueType.getTypesAtLevel(4) shouldBe emptyList()
            }
        }
    }
})