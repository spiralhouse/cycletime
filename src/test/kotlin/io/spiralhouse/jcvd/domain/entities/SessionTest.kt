package io.spiralhouse.jcvd.domain.entities

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.maps.shouldBeEmpty
import io.kotest.matchers.maps.shouldContainKey
import io.kotest.matchers.maps.shouldNotContainKey
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.jcvd.domain.exceptions.DomainException
import io.spiralhouse.jcvd.domain.services.MockTimeProvider
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * TDD Tests for Session Domain Entity - RED PHASE
 * 
 * These tests define the required behavior for the Session entity following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 * 
 * Requirements being tested:
 * 1. Session creation and initialization
 * 2. Context management and updates
 * 3. Project association
 * 4. Time-based expiration logic
 * 5. Active issue tracking
 * 6. Workflow stage management
 * 7. Context data operations
 * 8. Touch/activity tracking
 */
class SessionTest : DescribeSpec({
    
    describe("Session Entity") {
        val mockTimeProvider = MockTimeProvider()
        
        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        }
        
        describe("session creation and initialization") {
            
            it("should create session with valid session key") {
                // RED: Test will fail initially until proper Session implementation
                val sessionKey = SessionKey.generate()
                val session = Session.createWithKey(
                    sessionKey = sessionKey,
                    timeProvider = mockTimeProvider
                )
                
                // Drive implementation requirements
                session.sessionKey shouldBe sessionKey
                session.projectId shouldBe null
                session.currentContext.activeIssues.shouldBeEmpty()
                session.currentContext.workflowStage shouldBe null
                session.currentContext.lastAction shouldBe null
                session.currentContext.contextData.shouldBeEmpty()
                session.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                session.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }
            
            it("should create session with project association") {
                val sessionKey = SessionKey.generate()
                val projectId = ProjectId.generate()
                
                val session = Session.createWithKey(
                    sessionKey = sessionKey,
                    projectId = projectId,
                    timeProvider = mockTimeProvider
                )
                
                session.sessionKey shouldBe sessionKey
                session.projectId shouldBe projectId
                session.currentContext.activeIssues.shouldBeEmpty()
                session.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }
            
            it("should create session with initial context") {
                val sessionKey = SessionKey.generate()
                val initialContext = SessionContext(
                    activeIssues = listOf("SPI-123", "SPI-456"),
                    workflowStage = "development",
                    lastAction = "code review",
                    contextData = mapOf("branch" to "feature/test", "pr" to "123")
                )
                
                val session = Session.createWithKey(
                    sessionKey = sessionKey,
                    currentContext = initialContext,
                    timeProvider = mockTimeProvider
                )
                
                session.currentContext shouldBe initialContext
                session.currentContext.activeIssues shouldContain "SPI-123"
                session.currentContext.activeIssues shouldContain "SPI-456"
                session.currentContext.workflowStage shouldBe "development"
                session.currentContext.lastAction shouldBe "code review"
                session.currentContext.contextData shouldContainKey "branch"
                session.currentContext.contextData shouldContainKey "pr"
            }
            
            it("should use factory method to create session") {
                // RED: Factory method should exist and work properly
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.sessionKey.shouldBeInstanceOf<SessionKey>()
                session.projectId shouldBe null
                session.currentContext.activeIssues.shouldBeEmpty()
                session.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                session.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }
            
            it("should create session with project using factory method") {
                val projectId = ProjectId.generate()
                val session = Session.create(
                    projectId = projectId,
                    timeProvider = mockTimeProvider
                )
                
                session.projectId shouldBe projectId
                session.sessionKey.shouldBeInstanceOf<SessionKey>()
            }
            
            it("should generate unique session keys on creation") {
                val session1 = Session.create(timeProvider = mockTimeProvider)
                val session2 = Session.create(timeProvider = mockTimeProvider)
                val session3 = Session.create(timeProvider = mockTimeProvider)
                
                session1.sessionKey shouldNotBe session2.sessionKey
                session2.sessionKey shouldNotBe session3.sessionKey
                session1.sessionKey shouldNotBe session3.sessionKey
            }
            
            it("should use injected TimeProvider for all timestamps") {
                val specificTime = Instant.parse("2025-06-01T14:30:00Z")
                mockTimeProvider.setTime(specificTime)
                
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.createdAt shouldBe specificTime
                session.updatedAt shouldBe specificTime
                session.lastActivity shouldBe specificTime
            }
        }
        
        describe("context management") {
            
            it("should update entire context") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val originalTime = session.updatedAt
                
                mockTimeProvider.advance(10.minutes)
                
                val newContext = SessionContext(
                    activeIssues = listOf("SPI-789"),
                    workflowStage = "testing",
                    lastAction = "manual testing",
                    contextData = mapOf("test" to "ui", "browser" to "chrome")
                )
                
                session.updateContext(newContext)
                
                session.currentContext shouldBe newContext
                session.currentContext.activeIssues shouldContain "SPI-789"
                session.currentContext.workflowStage shouldBe "testing"
                session.currentContext.lastAction shouldBe "manual testing"
                session.currentContext.contextData shouldContainKey "test"
                session.updatedAt shouldNotBe originalTime
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:10:00Z")
            }
            
            it("should update context using lambda") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(5.minutes)
                
                session.updateContext { 
                    copy(
                        workflowStage = "deployment",
                        lastAction = "creating release"
                    )
                }
                
                session.currentContext.workflowStage shouldBe "deployment"
                session.currentContext.lastAction shouldBe "creating release"
                session.currentContext.activeIssues.shouldBeEmpty() // Should preserve other fields
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:05:00Z")
            }
            
            it("should add active issue") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(2.minutes)
                
                session.addActiveIssue("SPI-100")
                
                session.currentContext.activeIssues shouldContain "SPI-100"
                session.currentContext.activeIssues shouldHaveSize 1
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:02:00Z")
            }
            
            it("should add multiple active issues") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.addActiveIssue("SPI-100")
                session.addActiveIssue("SPI-200")
                session.addActiveIssue("SPI-300")
                
                session.currentContext.activeIssues shouldContain "SPI-100"
                session.currentContext.activeIssues shouldContain "SPI-200"
                session.currentContext.activeIssues shouldContain "SPI-300"
                session.currentContext.activeIssues shouldHaveSize 3
            }
            
            it("should not add duplicate active issues") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.addActiveIssue("SPI-100")
                session.addActiveIssue("SPI-100") // Duplicate
                
                session.currentContext.activeIssues shouldContain "SPI-100"
                session.currentContext.activeIssues shouldHaveSize 1
            }
            
            it("should remove active issue") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.addActiveIssue("SPI-100")
                session.addActiveIssue("SPI-200")
                
                mockTimeProvider.advance(3.minutes)
                
                session.removeActiveIssue("SPI-100")
                
                session.currentContext.activeIssues shouldNotContain "SPI-100"
                session.currentContext.activeIssues shouldContain "SPI-200"
                session.currentContext.activeIssues shouldHaveSize 1
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:03:00Z")
            }
            
            it("should ignore removing non-existent issue") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.addActiveIssue("SPI-100")
                session.removeActiveIssue("SPI-999") // Non-existent
                
                session.currentContext.activeIssues shouldContain "SPI-100"
                session.currentContext.activeIssues shouldHaveSize 1
            }
            
            it("should set workflow stage") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(4.minutes)
                
                session.setWorkflowStage("planning")
                
                session.currentContext.workflowStage shouldBe "planning"
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:04:00Z")
            }
            
            it("should clear workflow stage with null") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.setWorkflowStage("development")
                session.setWorkflowStage(null)
                
                session.currentContext.workflowStage shouldBe null
            }
            
            it("should set last action") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(6.minutes)
                
                session.setLastAction("writing tests")
                
                session.currentContext.lastAction shouldBe "writing tests"
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:06:00Z")
            }
            
            it("should clear last action with null") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.setLastAction("debugging code")
                session.setLastAction(null)
                
                session.currentContext.lastAction shouldBe null
            }
        }
        
        describe("context data operations") {
            
            it("should add context data") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(7.minutes)
                
                session.updateContextData("environment", "staging")
                
                session.currentContext.contextData shouldContainKey "environment"
                session.currentContext.contextData["environment"] shouldBe "staging"
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:07:00Z")
            }
            
            it("should add multiple context data entries") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.updateContextData("branch", "feature/test")
                session.updateContextData("reviewer", "john.doe")
                session.updateContextData("priority", "high")
                
                session.currentContext.contextData shouldContainKey "branch"
                session.currentContext.contextData shouldContainKey "reviewer"
                session.currentContext.contextData shouldContainKey "priority"
                session.currentContext.contextData["branch"] shouldBe "feature/test"
                session.currentContext.contextData["reviewer"] shouldBe "john.doe"
                session.currentContext.contextData["priority"] shouldBe "high"
            }
            
            it("should update existing context data") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.updateContextData("status", "draft")
                session.updateContextData("status", "ready")
                
                session.currentContext.contextData["status"] shouldBe "ready"
                session.currentContext.contextData.keys shouldHaveSize 1
            }
            
            it("should remove context data") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.updateContextData("temporary", "value")
                session.updateContextData("permanent", "keep")
                
                mockTimeProvider.advance(8.minutes)
                
                session.removeContextData("temporary")
                
                session.currentContext.contextData shouldNotContainKey "temporary"
                session.currentContext.contextData shouldContainKey "permanent"
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:08:00Z")
            }
            
            it("should ignore removing non-existent context data") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.updateContextData("exists", "value")
                session.removeContextData("nonexistent")
                
                session.currentContext.contextData shouldContainKey "exists"
                session.currentContext.contextData.keys shouldHaveSize 1
            }
        }
        
        describe("project association") {
            
            it("should set project") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val projectId = ProjectId.generate()
                
                mockTimeProvider.advance(9.minutes)
                
                session.setProject(projectId)
                
                session.projectId shouldBe projectId
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:09:00Z")
            }
            
            it("should change project") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val project1 = ProjectId.generate()
                val project2 = ProjectId.generate()
                
                session.setProject(project1)
                session.setProject(project2)
                
                session.projectId shouldBe project2
            }
            
            it("should clear project with null") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val projectId = ProjectId.generate()
                
                session.setProject(projectId)
                session.setProject(null)
                
                session.projectId shouldBe null
            }
        }
        
        describe("activity tracking and touch") {
            
            it("should update activity on touch") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val originalActivity = session.lastActivity
                val originalUpdated = session.updatedAt
                
                mockTimeProvider.advance(15.minutes)
                
                session.touch()
                
                session.lastActivity shouldNotBe originalActivity
                session.updatedAt shouldNotBe originalUpdated
                session.lastActivity shouldBe Instant.parse("2025-01-15T10:15:00Z")
                session.updatedAt shouldBe Instant.parse("2025-01-15T10:15:00Z")
                session.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z") // Should remain unchanged
            }
            
            it("should update activity on any operation") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Test that each operation touches the session
                val operations = listOf(
                    { mockTimeProvider.advance(1.minutes); session.addActiveIssue("SPI-1") },
                    { mockTimeProvider.advance(1.minutes); session.removeActiveIssue("SPI-1") },
                    { mockTimeProvider.advance(1.minutes); session.setWorkflowStage("testing") },
                    { mockTimeProvider.advance(1.minutes); session.setLastAction("debugging") },
                    { mockTimeProvider.advance(1.minutes); session.updateContextData("key", "value") },
                    { mockTimeProvider.advance(1.minutes); session.removeContextData("key") },
                    { mockTimeProvider.advance(1.minutes); session.setProject(ProjectId.generate()) }
                )
                
                val expectedTimes = listOf(
                    Instant.parse("2025-01-15T10:01:00Z"),
                    Instant.parse("2025-01-15T10:02:00Z"),
                    Instant.parse("2025-01-15T10:03:00Z"),
                    Instant.parse("2025-01-15T10:04:00Z"),
                    Instant.parse("2025-01-15T10:05:00Z"),
                    Instant.parse("2025-01-15T10:06:00Z"),
                    Instant.parse("2025-01-15T10:07:00Z")
                )
                
                operations.forEachIndexed { index, operation ->
                    operation()
                    session.lastActivity shouldBe expectedTimes[index]
                    session.updatedAt shouldBe expectedTimes[index]
                }
            }
            
            it("should maintain separate timestamps") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val createdAt = session.createdAt
                
                mockTimeProvider.advance(1.hours)
                session.touch()
                
                session.createdAt shouldBe createdAt // Should never change
                session.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
                session.lastActivity shouldBe Instant.parse("2025-01-15T11:00:00Z")
            }
        }
        
        describe("expiration logic") {
            
            it("should not be expired when newly created") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.isExpired() shouldBe false
                session.isExpired(1.days) shouldBe false
                session.isExpired(1.hours) shouldBe false
                session.isExpired(1.minutes) shouldBe false
            }
            
            it("should not be expired within maxAge") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Advance time but stay within default 7 days
                mockTimeProvider.advance(6.days)
                
                session.isExpired() shouldBe false
                session.isExpired(7.days) shouldBe false
            }
            
            it("should be expired after maxAge") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Advance time beyond default 7 days
                mockTimeProvider.advance(8.days)
                
                session.isExpired() shouldBe true
                session.isExpired(7.days) shouldBe true
            }
            
            it("should be expired exactly at maxAge") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(7.days)
                
                session.isExpired() shouldBe true
                session.isExpired(7.days) shouldBe true
            }
            
            it("should respect custom maxAge") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(2.hours)
                
                session.isExpired(1.hours) shouldBe true
                session.isExpired(3.hours) shouldBe false
                session.isExpired(2.hours) shouldBe true
            }
            
            it("should use lastActivity for expiration calculation") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Advance time and touch session (updates lastActivity)
                mockTimeProvider.advance(1.days)
                session.touch()
                
                // Advance another day (total 2 days since creation, 1 day since touch)
                mockTimeProvider.advance(1.days)
                
                session.isExpired(2.days) shouldBe false // 1 day since last activity
                session.isExpired(23.hours) shouldBe true // More than 1 day since last activity
            }
            
            it("should update lastActivity when session is used") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Let session age
                mockTimeProvider.advance(6.days)
                
                // Use session (should update lastActivity)
                session.addActiveIssue("SPI-REFRESH")
                
                // Advance more time
                mockTimeProvider.advance(6.days)
                
                // Should not be expired because lastActivity was updated
                session.isExpired(7.days) shouldBe false
            }
            
            it("should handle very short expiration times") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(61.seconds)
                
                session.isExpired(1.minutes) shouldBe true
                session.isExpired(60.seconds) shouldBe true
                session.isExpired(62.seconds) shouldBe false
            }
            
            it("should handle very long expiration times") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                mockTimeProvider.advance(365.days)
                
                session.isExpired(400.days) shouldBe false
                session.isExpired(300.days) shouldBe true
            }
        }
        
        describe("edge cases and error conditions") {
            
            it("should propagate TimeProvider errors") {
                // RED: This test verifies TimeProvider errors are properly propagated
                val brokenTimeProvider = object : TimeProvider {
                    override fun now(): Instant {
                        throw IllegalStateException("TimeProvider is corrupted")
                    }
                }
                
                shouldThrow<IllegalStateException> {
                    Session.createWithKey(
                        sessionKey = SessionKey.generate(),
                        timeProvider = brokenTimeProvider
                    ).touch() // This should trigger the TimeProvider
                }.message shouldContain "TimeProvider is corrupted"
            }
            
            it("should handle rapid successive operations") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                // Perform many operations in quick succession
                repeat(100) { i ->
                    session.addActiveIssue("SPI-$i")
                    session.updateContextData("key$i", "value$i")
                    session.setWorkflowStage("stage$i")
                }
                
                session.currentContext.activeIssues shouldHaveSize 100
                session.currentContext.contextData.keys shouldHaveSize 100
                session.currentContext.workflowStage shouldBe "stage99"
            }
            
            it("should maintain consistency during mixed operations") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val projectId = ProjectId.generate()
                
                // Mix various operations
                session.setProject(projectId)
                session.addActiveIssue("SPI-1")
                session.setWorkflowStage("development")
                session.updateContextData("branch", "feature/test")
                session.addActiveIssue("SPI-2")
                session.setLastAction("coding")
                session.removeActiveIssue("SPI-1")
                session.updateContextData("status", "in-progress")
                
                // Verify final state consistency
                session.projectId shouldBe projectId
                session.currentContext.activeIssues shouldContain "SPI-2"
                session.currentContext.activeIssues shouldNotContain "SPI-1"
                session.currentContext.activeIssues shouldHaveSize 1
                session.currentContext.workflowStage shouldBe "development"
                session.currentContext.lastAction shouldBe "coding"
                session.currentContext.contextData shouldContainKey "branch"
                session.currentContext.contextData shouldContainKey "status"
                session.currentContext.contextData["branch"] shouldBe "feature/test"
                session.currentContext.contextData["status"] shouldBe "in-progress"
            }
            
            it("should handle empty string inputs gracefully") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.addActiveIssue("")
                session.setWorkflowStage("")
                session.setLastAction("")
                session.updateContextData("", "value")
                session.updateContextData("key", "")
                
                session.currentContext.activeIssues shouldContain ""
                session.currentContext.workflowStage shouldBe ""
                session.currentContext.lastAction shouldBe ""
                session.currentContext.contextData shouldContainKey ""
                session.currentContext.contextData shouldContainKey "key"
                session.currentContext.contextData[""] shouldBe "value"
                session.currentContext.contextData["key"] shouldBe ""
            }
            
            it("should preserve immutability of context data") {
                val session = Session.create(timeProvider = mockTimeProvider)
                
                session.updateContextData("original", "value")
                val contextBefore = session.currentContext
                
                session.updateContextData("new", "value")
                val contextAfter = session.currentContext
                
                // Original context should be unchanged
                contextBefore shouldNotBe contextAfter
                contextBefore.contextData shouldNotContainKey "new"
                contextAfter.contextData shouldContainKey "new"
                contextAfter.contextData shouldContainKey "original"
            }
        }
        
        describe("time provider integration") {
            
            it("should use TimeProvider consistently") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val baseTime = Instant.parse("2025-01-15T10:00:00Z")
                
                // All timestamps should start the same
                session.createdAt shouldBe baseTime
                session.updatedAt shouldBe baseTime
                session.lastActivity shouldBe baseTime
                
                // Advance time and perform operation
                mockTimeProvider.advance(30.minutes)
                session.touch()
                
                val updatedTime = Instant.parse("2025-01-15T10:30:00Z")
                session.updatedAt shouldBe updatedTime
                session.lastActivity shouldBe updatedTime
                session.createdAt shouldBe baseTime // Should remain unchanged
            }
            
            it("should handle time going backwards gracefully") {
                val session = Session.create(timeProvider = mockTimeProvider)
                val originalTime = session.lastActivity
                
                // Move time backwards (unusual but possible in testing)
                mockTimeProvider.setTime(Instant.parse("2025-01-15T09:00:00Z"))
                session.touch()
                
                // Should accept the new time from TimeProvider
                session.lastActivity shouldBe Instant.parse("2025-01-15T09:00:00Z")
                session.lastActivity shouldNotBe originalTime
            }
            
            it("should work with different TimeProvider implementations") {
                val customTimeProvider = object : TimeProvider {
                    override fun now(): Instant = Instant.parse("2025-12-31T23:59:59Z")
                }
                
                val session = Session.create(timeProvider = customTimeProvider)
                
                session.createdAt shouldBe Instant.parse("2025-12-31T23:59:59Z")
                session.updatedAt shouldBe Instant.parse("2025-12-31T23:59:59Z")
                session.lastActivity shouldBe Instant.parse("2025-12-31T23:59:59Z")
            }
        }
    }
})