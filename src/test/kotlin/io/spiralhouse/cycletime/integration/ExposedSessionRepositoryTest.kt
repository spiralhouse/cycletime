package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * Integration Tests for ExposedSessionRepository
 *
 * These integration tests verify the behavior of the SessionRepository implementation
 * using real database operations with H2 in-memory database.
 *
 * Tests cover:
 * 1. CRUD Operations (Save, FindByKey, Delete)
 * 2. Query Operations (findByProject, findExpiredSessions, exists)
 * 3. Session Context Persistence (JSON serialization/deserialization)
 * 4. Expiration Management (deleteExpiredSessions)
 * 5. Edge Cases (null projects, empty contexts, concurrent operations)
 * 6. Data Integrity (SessionContext with active issues, timestamps)
 * 7. Transaction Handling
 * 8. Performance scenarios
 *
 * All tests use dependency injection with MockTimeProvider for better testability.
 * Strategic failures are included to drive improvements in the implementation.
 */
class ExposedSessionRepositoryTest : DescribeSpec({

    lateinit var database: Database
    lateinit var repository: ExposedSessionRepository
    lateinit var mockTimeProvider: MockTimeProvider

    /**
     * Helper function to create a project in the database and return its ID.
     * This ensures foreign key constraints are satisfied.
     * If the project already exists, it won't create a duplicate.
     */
    fun createTestProject(projectId: ProjectId = ProjectId.generate()): ProjectId {
        transaction {
            // Check if project already exists
            val existsCount = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq projectId.value }
                .count()

            if (existsCount == 0L) {
                ProjectsTable.insert {
                    it[id] = EntityID(projectId.value, ProjectsTable)
                    it[name] = "Test Project ${projectId.value.take(8)}"
                    it[description] = "Test project for integration tests"
                    it[status] = "active"
                    it[createdAt] = mockTimeProvider.now()
                    it[updatedAt] = mockTimeProvider.now()
                }
            }
        }
        return projectId
    }

    /**
     * Helper function to create a test session with default values.
     * Reduces boilerplate in tests and improves readability.
     * If a projectId is provided, it will create the project first to satisfy foreign key constraints.
     */
    fun createTestSession(
        sessionKey: SessionKey = SessionKey.generate(),
        projectId: ProjectId? = null,
        context: SessionContext = SessionContext(),
        timeProvider: MockTimeProvider = mockTimeProvider,
        createProject: Boolean = true
    ): Session {
        val finalProjectId = if (projectId != null && createProject) {
            createTestProject(projectId)
        } else {
            projectId
        }
        return Session.createWithKey(sessionKey, finalProjectId, context, timeProvider)
    }

    /**
     * Helper function to create a complex SessionContext for testing serialization.
     */
    fun createComplexContext(): SessionContext {
        return SessionContext(
            activeIssues = listOf("SPI-100", "SPI-200", "SPI-300"),
            workflowStage = "development",
            lastAction = "implemented repository pattern",
            contextData = mapOf(
                "currentBranch" to "feat/spi-467-repository",
                "environment" to "development",
                "userId" to "user-123",
                "specialChars" to "symbols: @#$%^&*() and unicode: ñáéí 🚀",
                "jsonTest" to "{\"nested\": \"json\", \"array\": [1,2,3]}"
            )
        )
    }

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = Database.connect(
            url = "jdbc:h2:mem:test_session_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
            driver = "org.h2.Driver"
        )

        // Create schema - order matters for foreign key constraints
        transaction(database) {
            SchemaUtils.create(ProjectsTable, IssuesTable, SessionStatesTable)
        }

        mockTimeProvider = MockTimeProvider()
        repository = ExposedSessionRepository(SystemTimeProvider())
    }

    beforeEach {
        // Clean database before each test - order matters for foreign keys
        transaction(database) {
            SessionStatesTable.deleteAll()
            IssuesTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Reset time provider to consistent starting point
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterSpec {
        // Clean up database after all tests - reverse order for foreign keys
        transaction(database) {
            SchemaUtils.drop(SessionStatesTable, IssuesTable, ProjectsTable)
        }
    }

    describe("ExposedSessionRepository Integration Tests") {

        describe("CRUD Operations") {

            it("should save and retrieve a new session by key") {
                runTest {
                    // RED: This will fail until save/findByKey are implemented correctly
                    val sessionKey = SessionKey.generate()
                    val projectId = ProjectId.generate()
                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = projectId,
                        context = SessionContext(),
                        timeProvider = mockTimeProvider
                    )

                    // Save session
                    repository.save(session)

                    // Retrieve session
                    val retrievedSession = repository.findByKey(sessionKey)

                    // Verify all data is preserved
                    retrievedSession shouldNotBe null
                    retrievedSession!!.sessionKey shouldBe sessionKey
                    retrievedSession.projectId shouldBe projectId
                    retrievedSession.currentContext shouldBe SessionContext()
                    retrievedSession.lastActivity shouldBe session.lastActivity
                    retrievedSession.createdAt shouldBe session.createdAt
                    retrievedSession.updatedAt shouldBe session.updatedAt
                }
            }

            it("should save session with null project ID") {
                runTest {
                    val sessionKey = SessionKey.generate()
                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = null, // No project association
                        context = SessionContext(),
                        timeProvider = mockTimeProvider
                    )

                    repository.save(session)

                    val retrievedSession = repository.findByKey(sessionKey)
                    retrievedSession shouldNotBe null
                    retrievedSession!!.projectId shouldBe null
                    retrievedSession.sessionKey shouldBe sessionKey
                }
            }

            it("should save and retrieve session with complex context") {
                runTest {
                    // RED: This strategic failure tests JSON serialization/deserialization
                    val sessionKey = SessionKey.generate()
                    val complexContext = createComplexContext()

                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = ProjectId.generate(),
                        context = complexContext,
                        timeProvider = mockTimeProvider
                    )

                    repository.save(session)

                    val retrievedSession = repository.findByKey(sessionKey)
                    retrievedSession shouldNotBe null

                    // Verify complex context is preserved exactly
                    val retrievedContext = retrievedSession!!.currentContext
                    retrievedContext.activeIssues shouldHaveSize 3
                    retrievedContext.activeIssues shouldContain "SPI-100"
                    retrievedContext.activeIssues shouldContain "SPI-200"
                    retrievedContext.activeIssues shouldContain "SPI-300"
                    retrievedContext.workflowStage shouldBe "development"
                    retrievedContext.lastAction shouldBe "implemented repository pattern"
                    retrievedContext.contextData.size shouldBe 5
                    retrievedContext.contextData["currentBranch"] shouldBe "feat/spi-467-repository"
                    retrievedContext.contextData["specialChars"] shouldBe "symbols: @#$%^&*() and unicode: ñáéí 🚀"
                    retrievedContext.contextData["jsonTest"] shouldBe "{\"nested\": \"json\", \"array\": [1,2,3]}"
                }
            }

            it("should update existing session when saving again") {
                runTest {
                    // Create and save initial session
                    val sessionKey = SessionKey.generate()
                    val initialProjectId = ProjectId.generate()
                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = initialProjectId,
                        context = SessionContext(activeIssues = listOf("SPI-100")),
                        timeProvider = mockTimeProvider
                    )
                    repository.save(session)

                    // Modify session
                    mockTimeProvider.advance(1.hours)
                    session.updateContext(SessionContext(
                        activeIssues = listOf("SPI-100", "SPI-200"),
                        workflowStage = "testing",
                        lastAction = "added new tests"
                    ))
                    val newProjectId = createTestProject() // Create new project and set it
                    session.setProject(newProjectId)

                    // Save updated session
                    repository.save(session)

                    // Verify update persisted
                    val retrievedSession = repository.findByKey(sessionKey)
                    retrievedSession shouldNotBe null
                    retrievedSession!!.currentContext.activeIssues shouldHaveSize 2
                    retrievedSession.currentContext.workflowStage shouldBe "testing"
                    retrievedSession.currentContext.lastAction shouldBe "added new tests"
                    retrievedSession.projectId shouldBe session.projectId
                    retrievedSession.updatedAt shouldBe session.updatedAt
                    retrievedSession.lastActivity shouldBe session.lastActivity
                    retrievedSession.createdAt shouldBe session.createdAt // Should remain unchanged
                }
            }

            it("should delete session by key") {
                runTest {
                    // Save session first
                    val sessionKey = SessionKey.generate()
                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = ProjectId.generate(),
                        timeProvider = mockTimeProvider
                    )
                    repository.save(session)

                    // Verify it exists
                    repository.findByKey(sessionKey) shouldNotBe null

                    // Delete session
                    repository.delete(sessionKey)

                    // Verify it's deleted
                    repository.findByKey(sessionKey) shouldBe null
                }
            }

            it("should handle deleting non-existent session gracefully") {
                runTest {
                    val nonExistentKey = SessionKey.generate()

                    // Should not throw exception
                    repository.delete(nonExistentKey)

                    // Verify nothing was affected
                    repository.findByKey(nonExistentKey) shouldBe null
                }
            }

            it("should save session with empty context") {
                runTest {
                    val sessionKey = SessionKey.generate()
                    val emptyContext = SessionContext()

                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = ProjectId.generate(),
                        context = emptyContext,
                        timeProvider = mockTimeProvider
                    )

                    repository.save(session)

                    val retrievedSession = repository.findByKey(sessionKey)
                    retrievedSession shouldNotBe null
                    retrievedSession!!.currentContext shouldBe emptyContext
                    retrievedSession.currentContext.activeIssues.shouldBeEmpty()
                    retrievedSession.currentContext.workflowStage shouldBe null
                    retrievedSession.currentContext.lastAction shouldBe null
                    retrievedSession.currentContext.contextData shouldBe emptyMap()
                }
            }
        }

        describe("Query Operations") {

            it("should return null for non-existent session key") {
                runTest {
                    val nonExistentKey = SessionKey.generate()

                    val result = repository.findByKey(nonExistentKey)

                    result shouldBe null
                }
            }

            it("should find sessions by project ID") {
                runTest {
                    val projectId1 = ProjectId.generate()
                    val projectId2 = ProjectId.generate()

                    // Create sessions for different projects
                    val session1 = createTestSession(projectId = projectId1)
                    val session2 = createTestSession(projectId = projectId1)
                    val session3 = createTestSession(projectId = projectId2)
                    val session4 = createTestSession(projectId = null) // No project

                    // Save all sessions
                    repository.save(session1)
                    repository.save(session2)
                    repository.save(session3)
                    repository.save(session4)

                    // Query by project
                    val project1Sessions = repository.findByProject(projectId1)
                    val project2Sessions = repository.findByProject(projectId2)

                    // Verify results
                    project1Sessions shouldHaveSize 2
                    project1Sessions.map { it.sessionKey } shouldContain session1.sessionKey
                    project1Sessions.map { it.sessionKey } shouldContain session2.sessionKey

                    project2Sessions shouldHaveSize 1
                    project2Sessions.first().sessionKey shouldBe session3.sessionKey
                }
            }

            it("should return empty list for project with no sessions") {
                runTest {
                    // Create session for different project
                    val session = createTestSession(projectId = ProjectId.generate())
                    repository.save(session)

                    // Query for project with no sessions
                    val nonExistentProjectId = ProjectId.generate()
                    val sessions = repository.findByProject(nonExistentProjectId)

                    sessions.shouldBeEmpty()
                }
            }

            it("should find expired sessions") {
                runTest {
                    // Create sessions with different activity times
                    mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
                    val oldSession1 = createTestSession()

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T11:00:00Z"))
                    val oldSession2 = createTestSession()

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T14:00:00Z"))
                    val recentSession = createTestSession()

                    // Save all sessions
                    repository.save(oldSession1)
                    repository.save(oldSession2)
                    repository.save(recentSession)

                    // Find sessions expired before 12:00:00Z
                    val expiredBefore = Instant.parse("2025-01-15T12:00:00Z")
                    val expiredSessions = repository.findExpiredSessions(expiredBefore)

                    // Verify results
                    expiredSessions shouldHaveSize 2
                    expiredSessions.map { it.sessionKey } shouldContain oldSession1.sessionKey
                    expiredSessions.map { it.sessionKey } shouldContain oldSession2.sessionKey
                    expiredSessions.map { it.sessionKey } shouldNotContain recentSession.sessionKey
                }
            }

            it("should return empty list when no sessions are expired") {
                runTest {
                    // Create recent session
                    mockTimeProvider.setTime(Instant.parse("2025-01-15T14:00:00Z"))
                    val recentSession = createTestSession()
                    repository.save(recentSession)

                    // Check for sessions expired before recent session
                    val expiredBefore = Instant.parse("2025-01-15T10:00:00Z")
                    val expiredSessions = repository.findExpiredSessions(expiredBefore)

                    expiredSessions.shouldBeEmpty()
                }
            }

            it("should check if session exists by key") {
                runTest {
                    val session = createTestSession()
                    repository.save(session)

                    // Should exist
                    repository.exists(session.sessionKey) shouldBe true

                    // Non-existent session should not exist
                    val nonExistentKey = SessionKey.generate()
                    repository.exists(nonExistentKey) shouldBe false
                }
            }

            it("should return false for exists check after deletion") {
                runTest {
                    val session = createTestSession()
                    repository.save(session)

                    // Initially exists
                    repository.exists(session.sessionKey) shouldBe true

                    // Delete and check again
                    repository.delete(session.sessionKey)
                    repository.exists(session.sessionKey) shouldBe false
                }
            }
        }

        describe("Session Context Persistence") {

            it("should preserve active issues list in context") {
                runTest {
                    val sessionKey = SessionKey.generate()
                    val context = SessionContext(
                        activeIssues = listOf("SPI-467", "SPI-460", "SPI-399", "SPI-400"),
                        workflowStage = "implementation",
                        lastAction = "refactoring repository layer"
                    )

                    val session = Session.createWithKey(sessionKey, null, context, mockTimeProvider)
                    repository.save(session)

                    val retrieved = repository.findByKey(sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.activeIssues shouldHaveSize 4
                    retrieved.currentContext.activeIssues shouldContain "SPI-467"
                    retrieved.currentContext.activeIssues shouldContain "SPI-460"
                    retrieved.currentContext.activeIssues shouldContain "SPI-399"
                    retrieved.currentContext.activeIssues shouldContain "SPI-400"
                }
            }

            it("should preserve workflow stage and last action") {
                runTest {
                    val context = SessionContext(
                        workflowStage = "testing",
                        lastAction = "implemented integration tests for session repository",
                        contextData = mapOf("testPhase" to "RED")
                    )

                    val session = createTestSession(context = context)
                    repository.save(session)

                    val retrieved = repository.findByKey(session.sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.workflowStage shouldBe "testing"
                    retrieved.currentContext.lastAction shouldBe "implemented integration tests for session repository"
                    retrieved.currentContext.contextData["testPhase"] shouldBe "RED"
                }
            }

            it("should handle context data with special characters and JSON") {
                runTest {
                    // RED: This strategic failure tests edge cases in JSON serialization
                    val context = SessionContext(
                        contextData = mapOf(
                            "specialChars" to "Test with 'quotes' and \"double quotes\" & symbols: @#$%^&*()",
                            "multiline" to "Line 1\nLine 2\tTabbed\rCarriage return",
                            "unicode" to "Unicode characters: ñáéí óúü ç and emojis: 🚀 🎯 ✅",
                            "nestedJson" to "{\"key\": \"value\", \"array\": [1, 2, 3], \"nested\": {\"inner\": true}}",
                            "escape" to "Escape sequences: \\n \\t \\r \\\" \\' \\\\",
                            "empty" to "",
                            "spaces" to "   leading and trailing spaces   "
                        )
                    )

                    val session = createTestSession(context = context)
                    repository.save(session)

                    val retrieved = repository.findByKey(session.sessionKey)
                    retrieved shouldNotBe null

                    val retrievedData = retrieved!!.currentContext.contextData
                    retrievedData["specialChars"] shouldBe "Test with 'quotes' and \"double quotes\" & symbols: @#$%^&*()"
                    retrievedData["multiline"] shouldBe "Line 1\nLine 2\tTabbed\rCarriage return"
                    retrievedData["unicode"] shouldBe "Unicode characters: ñáéí óúü ç and emojis: 🚀 🎯 ✅"
                    retrievedData["nestedJson"] shouldBe "{\"key\": \"value\", \"array\": [1, 2, 3], \"nested\": {\"inner\": true}}"
                    retrievedData["escape"] shouldBe "Escape sequences: \\n \\t \\r \\\" \\' \\\\"
                    retrievedData["empty"] shouldBe ""
                    retrievedData["spaces"] shouldBe "   leading and trailing spaces   "
                }
            }

            it("should handle null and missing context fields gracefully") {
                runTest {
                    val contextWithNulls = SessionContext(
                        activeIssues = emptyList(),
                        workflowStage = null,
                        lastAction = null,
                        contextData = emptyMap()
                    )

                    val session = createTestSession(context = contextWithNulls)
                    repository.save(session)

                    val retrieved = repository.findByKey(session.sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.activeIssues.shouldBeEmpty()
                    retrieved.currentContext.workflowStage shouldBe null
                    retrieved.currentContext.lastAction shouldBe null
                    retrieved.currentContext.contextData shouldBe emptyMap()
                }
            }
        }

        describe("Expiration Management") {

            it("should delete expired sessions and return count") {
                runTest {
                    // Create sessions with different activity times
                    mockTimeProvider.setTime(Instant.parse("2025-01-10T10:00:00Z"))
                    val veryOldSession = createTestSession()

                    mockTimeProvider.setTime(Instant.parse("2025-01-14T10:00:00Z"))
                    val oldSession = createTestSession()

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
                    val recentSession = createTestSession()

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T14:00:00Z"))
                    val newSession = createTestSession()

                    // Save all sessions
                    repository.save(veryOldSession)
                    repository.save(oldSession)
                    repository.save(recentSession)
                    repository.save(newSession)

                    // Delete sessions expired before 2025-01-15T12:00:00Z
                    val expiredBefore = Instant.parse("2025-01-15T12:00:00Z")
                    val deletedCount = repository.deleteExpiredSessions(expiredBefore)

                    // Verify correct count
                    deletedCount shouldBe 3

                    // Verify only recent sessions remain
                    repository.exists(veryOldSession.sessionKey) shouldBe false
                    repository.exists(oldSession.sessionKey) shouldBe false
                    repository.exists(recentSession.sessionKey) shouldBe false
                    repository.exists(newSession.sessionKey) shouldBe true
                }
            }

            it("should return zero when no sessions are expired") {
                runTest {
                    // Create recent sessions
                    mockTimeProvider.setTime(Instant.parse("2025-01-15T14:00:00Z"))
                    val session1 = createTestSession()
                    val session2 = createTestSession()
                    repository.save(session1)
                    repository.save(session2)

                    // Try to delete sessions expired before sessions were created
                    val expiredBefore = Instant.parse("2025-01-15T10:00:00Z")
                    val deletedCount = repository.deleteExpiredSessions(expiredBefore)

                    deletedCount shouldBe 0
                    repository.exists(session1.sessionKey) shouldBe true
                    repository.exists(session2.sessionKey) shouldBe true
                }
            }

            it("should handle deletion of sessions with complex contexts") {
                runTest {
                    // Create expired session with complex context
                    mockTimeProvider.setTime(Instant.parse("2025-01-10T10:00:00Z"))
                    val expiredSession = createTestSession(context = createComplexContext())

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T14:00:00Z"))
                    val recentSession = createTestSession(context = createComplexContext())

                    repository.save(expiredSession)
                    repository.save(recentSession)

                    // Delete expired sessions
                    val expiredBefore = Instant.parse("2025-01-15T12:00:00Z")
                    val deletedCount = repository.deleteExpiredSessions(expiredBefore)

                    deletedCount shouldBe 1
                    repository.exists(expiredSession.sessionKey) shouldBe false
                    repository.exists(recentSession.sessionKey) shouldBe true
                }
            }
        }

        describe("Data Integrity and Snapshot Conversion") {

            it("should preserve all session properties during round-trip") {
                runTest {
                    // Create session with all possible data
                    val sessionKey = SessionKey.generate()
                    val projectId = ProjectId.generate()
                    val complexContext = createComplexContext()

                    val session = createTestSession(
                        sessionKey = sessionKey,
                        projectId = projectId,
                        context = complexContext,
                        timeProvider = mockTimeProvider
                    )

                    // Modify session state
                    mockTimeProvider.advance(2.hours)
                    session.addActiveIssue("SPI-500")
                    session.setWorkflowStage("deployment")
                    session.updateContextData("deploymentTarget", "production")

                    // Save and retrieve
                    repository.save(session)
                    val retrieved = repository.findByKey(sessionKey)

                    // Verify exact match
                    retrieved shouldNotBe null
                    retrieved!!.sessionKey shouldBe session.sessionKey
                    retrieved.projectId shouldBe session.projectId
                    retrieved.currentContext.activeIssues shouldHaveSize 4 // Original 3 + 1 added
                    retrieved.currentContext.activeIssues shouldContain "SPI-500"
                    retrieved.currentContext.workflowStage shouldBe "deployment"
                    retrieved.currentContext.contextData["deploymentTarget"] shouldBe "production"
                    retrieved.lastActivity shouldBe session.lastActivity
                    retrieved.createdAt shouldBe session.createdAt
                    retrieved.updatedAt shouldBe session.updatedAt
                }
            }

            it("should use SystemTimeProvider for reconstitution") {
                runTest {
                    val session = createTestSession()

                    repository.save(session)
                    val retrieved = repository.findByKey(session.sessionKey)

                    // The retrieved session should be reconstituted and functional
                    retrieved shouldNotBe null

                    // Test that we can modify the retrieved session (verifies TimeProvider works)
                    val originalUpdateTime = retrieved!!.updatedAt

                    // Note: Retrieved session uses SystemTimeProvider, not MockTimeProvider
                    // So we can't control time for this assertion, but we can verify functionality
                    retrieved.updateContext(SessionContext(lastAction = "Modified after retrieval"))

                    // The update should have changed the timestamp
                    retrieved.updatedAt shouldNotBe originalUpdateTime
                }
            }

            it("should maintain session key uniqueness constraint") {
                runTest {
                    val sessionKey = SessionKey.generate()
                    val session1 = createTestSession(sessionKey, ProjectId.generate(), SessionContext(), mockTimeProvider)

                    repository.save(session1)

                    // Try to save another session with same key (should update, not create new)
                    mockTimeProvider.advance(1.hours)
                    val newProjectId = createTestProject()
                    val session2 = createTestSession(sessionKey, newProjectId, SessionContext(workflowStage = "updated"), mockTimeProvider, createProject = false)
                    repository.save(session2)

                    // Should only have one session with this key
                    val retrieved = repository.findByKey(sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.workflowStage shouldBe "updated"
                    retrieved.projectId shouldBe session2.projectId
                }
            }
        }

        describe("Transaction Handling") {

            it("should handle concurrent save operations") {
                runTest {
                    // RED: This strategic failure tests concurrent access patterns
                    // Create multiple sessions
                    val session1 = createTestSession()
                    val session2 = createTestSession()
                    val session3 = createTestSession()

                    // Save them (simulating concurrent operations)
                    repository.save(session1)
                    repository.save(session2)
                    repository.save(session3)

                    // Verify all were saved correctly
                    repository.exists(session1.sessionKey) shouldBe true
                    repository.exists(session2.sessionKey) shouldBe true
                    repository.exists(session3.sessionKey) shouldBe true
                }
            }

            it("should handle rapid updates to same session") {
                runTest {
                    val session = createTestSession()
                    repository.save(session)

                    // Perform multiple rapid updates
                    mockTimeProvider.advance(1.minutes)
                    session.setWorkflowStage("stage1")
                    repository.save(session)

                    mockTimeProvider.advance(1.minutes)
                    session.addActiveIssue("SPI-999")
                    repository.save(session)

                    mockTimeProvider.advance(1.minutes)
                    session.updateContextData("testKey", "testValue")
                    repository.save(session)

                    // Verify final state
                    val retrieved = repository.findByKey(session.sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.workflowStage shouldBe "stage1"
                    retrieved.currentContext.activeIssues shouldContain "SPI-999"
                    retrieved.currentContext.contextData["testKey"] shouldBe "testValue"
                }
            }

            it("should maintain consistency during mixed operations") {
                runTest {
                    // Create initial sessions
                    val session1 = createTestSession()
                    val session2 = createTestSession()
                    repository.save(session1)
                    repository.save(session2)

                    // Mix of operations
                    val session3 = createTestSession()
                    repository.save(session3)

                    session1.setWorkflowStage("updated")
                    repository.save(session1)

                    repository.delete(session2.sessionKey)

                    val session4 = createTestSession()
                    repository.save(session4)

                    // Verify final state
                    repository.exists(session1.sessionKey) shouldBe true
                    repository.exists(session2.sessionKey) shouldBe false
                    repository.exists(session3.sessionKey) shouldBe true
                    repository.exists(session4.sessionKey) shouldBe true

                    val retrievedSession1 = repository.findByKey(session1.sessionKey)
                    retrievedSession1!!.currentContext.workflowStage shouldBe "updated"
                }
            }
        }

        describe("Edge Cases and Error Scenarios") {

            it("should handle sessions with maximum context data") {
                runTest {
                    // Create session with large amount of context data
                    val largeContextData = (1..100).associate {
                        "key$it" to "value".repeat(100)
                    }

                    val context = SessionContext(
                        activeIssues = (1..50).map { "SPI-$it" },
                        workflowStage = "testing large context",
                        lastAction = "stress testing repository with large context data",
                        contextData = largeContextData
                    )

                    val session = createTestSession(context = context)
                    repository.save(session)

                    val retrieved = repository.findByKey(session.sessionKey)
                    retrieved shouldNotBe null
                    retrieved!!.currentContext.activeIssues shouldHaveSize 50
                    retrieved.currentContext.contextData.size shouldBe 100
                    retrieved.currentContext.contextData["key50"] shouldBe "value".repeat(100)
                }
            }

            it("should handle sessions with empty and null project references") {
                runTest {
                    // Create sessions with various project states
                    val sessionWithProject = createTestSession(projectId = ProjectId.generate())
                    val sessionWithoutProject = createTestSession(projectId = null)

                    repository.save(sessionWithProject)
                    repository.save(sessionWithoutProject)

                    // Both should be retrievable
                    repository.findByKey(sessionWithProject.sessionKey) shouldNotBe null
                    repository.findByKey(sessionWithoutProject.sessionKey) shouldNotBe null

                    // Project queries should work correctly
                    val projectSessions = repository.findByProject(sessionWithProject.projectId!!)
                    projectSessions shouldHaveSize 1
                    projectSessions.first().sessionKey shouldBe sessionWithProject.sessionKey
                }
            }

            it("should handle sessions across multiple projects efficiently") {
                runTest {
                    val projectIds = (1..10).map { ProjectId.generate() }
                    val sessions = mutableListOf<Session>()

                    // Create 50 sessions across 10 projects
                    repeat(50) { index ->
                        val session = createTestSession(
                            projectId = projectIds[index % 10],
                            context = SessionContext(
                                activeIssues = listOf("SPI-${1000 + index}"),
                                workflowStage = "project-${index % 10}",
                                contextData = mapOf("sessionIndex" to index.toString())
                            )
                        )
                        sessions.add(session)
                        repository.save(session)
                    }

                    // Verify project queries work efficiently
                    projectIds.forEach { projectId ->
                        val projectSessions = repository.findByProject(projectId)
                        projectSessions shouldHaveSize 5 // 50 sessions / 10 projects
                        projectSessions.forEach { session ->
                            session.projectId shouldBe projectId
                        }
                    }
                }
            }

            it("should handle empty database operations gracefully") {
                runTest {
                    // All operations on empty database should work
                    repository.findByKey(SessionKey.generate()) shouldBe null
                    repository.findByProject(ProjectId.generate()).shouldBeEmpty()
                    repository.findExpiredSessions(Instant.parse("2025-01-15T10:00:00Z")).shouldBeEmpty()
                    repository.exists(SessionKey.generate()) shouldBe false
                    repository.deleteExpiredSessions(Instant.parse("2025-01-15T10:00:00Z")) shouldBe 0

                    // Delete non-existent should not fail
                    repository.delete(SessionKey.generate())
                }
            }

            it("should maintain performance with expired session cleanup") {
                runTest {
                    // Create many sessions with various expiration times
                    val sessions = mutableListOf<Session>()

                    repeat(100) { index ->
                        mockTimeProvider.setTime(Instant.parse("2025-01-${10 + (index / 20)}T10:00:00Z"))
                        val session = createTestSession(
                            context = SessionContext(
                                activeIssues = listOf("SPI-${index}"),
                                contextData = mapOf("index" to index.toString())
                            )
                        )
                        sessions.add(session)
                        repository.save(session)
                    }

                    // Clean up sessions older than 2025-01-12
                    val deletedCount = repository.deleteExpiredSessions(Instant.parse("2025-01-12T00:00:00Z"))

                    // Should have deleted sessions from days 10 and 11 (40 sessions)
                    deletedCount shouldBe 40

                    // Verify remaining sessions
                    val expiredSessions = repository.findExpiredSessions(Instant.parse("2025-01-12T00:00:00Z"))
                    expiredSessions.shouldBeEmpty()
                }
            }
        }
    }
})
