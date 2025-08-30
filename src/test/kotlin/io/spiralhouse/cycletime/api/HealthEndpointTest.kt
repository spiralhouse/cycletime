package io.spiralhouse.cycletime.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.module
import io.spiralhouse.cycletime.module
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.jetbrains.exposed.sql.Database

/**
 * Tests for the health endpoint, including failure scenarios.
 * 
 * These tests verify that the health endpoint:
 * - Returns proper status codes
 * - Handles database failures gracefully
 * - Provides appropriate error messages
 * - Doesn't leak sensitive information
 */
class HealthEndpointTest : StringSpec({
    
    "should return healthy status when all services are operational" {
        testApplication {
            application {
                module()
            }
            
            val response = client.get("/health")
            response.status shouldBe HttpStatusCode.OK
            
            val body = response.bodyAsText()
            body shouldContain "healthy"
            body shouldContain "CycleTime"
        }
    }
    
    "should return unhealthy status when database is unavailable" {
        testApplication {
            application {
                // Configure with a failing database
                dependencies {
                    provide<TimeProvider> { SystemTimeProvider() }
                    
                    provide<Database> {
                        // This database will fail when accessed
                        Database.connect(
                            url = "jdbc:h2:tcp://nonexistent:9999/test",
                            driver = "org.h2.Driver"
                        )
                    }
                    
                    provide<UnitOfWork> { 
                        ExposedUnitOfWork(resolve())
                    }
                    
                    provide<ProjectRepository> { 
                        ExposedProjectRepository(resolve(), resolve())
                    }
                    
                    provide<IssueRepository> { 
                        ExposedIssueRepository(resolve(), resolve())
                    }
                    
                    provide<SessionRepository> { 
                        ExposedSessionRepository(resolve(), resolve())
                    }
                    
                    provide<ProjectApplicationService> {
                        ProjectApplicationService(
                            projectRepository = resolve(),
                            issueRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                    
                    provide<SessionApplicationService> {
                        SessionApplicationService(
                            sessionRepository = resolve(),
                            projectRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                }
                module()
            }
            
            val response = client.get("/health")
            response.status shouldBe HttpStatusCode.InternalServerError
            
            val body = response.bodyAsText()
            body shouldContain "unhealthy"
            body shouldContain "Internal service error"
            // Should NOT contain sensitive database connection details
            body shouldContain "error"
        }
    }
    
    "should not leak sensitive information in error responses" {
        testApplication {
            application {
                // Configure with intentionally broken service
                dependencies {
                    provide<TimeProvider> { SystemTimeProvider() }
                    provide<Database> { TestDatabaseFactory.createTestDatabase() }
                    provide<UnitOfWork> { ExposedUnitOfWork(resolve()) }
                    
                    // Provide a repository that will throw with sensitive info
                    provide<ProjectRepository> {
                        object : ProjectRepository {
                            override suspend fun save(project: io.spiralhouse.cycletime.domain.entities.Project) {
                                throw RuntimeException("Database password: secret123")
                            }
                            override suspend fun findById(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) = 
                                throw RuntimeException("Connection string: user:pass@localhost")
                            override suspend fun findByStatus(status: io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus) = 
                                throw RuntimeException("API_KEY=abc123def456")
                            override suspend fun findAll() = 
                                throw RuntimeException("API_KEY=abc123def456")
                            override suspend fun delete(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) {}
                            override suspend fun exists(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) = false
                        }
                    }
                    
                    provide<IssueRepository> { 
                        ExposedIssueRepository(resolve(), resolve())
                    }
                    
                    provide<SessionRepository> { 
                        ExposedSessionRepository(resolve(), resolve())
                    }
                    
                    provide<ProjectApplicationService> {
                        ProjectApplicationService(
                            projectRepository = resolve(),
                            issueRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                    
                    provide<SessionApplicationService> {
                        SessionApplicationService(
                            sessionRepository = resolve(),
                            projectRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                }
                module()
            }
            
            val response = client.get("/health")
            response.status shouldBe HttpStatusCode.InternalServerError
            
            val body = response.bodyAsText()
            // Should contain generic error message
            body shouldContain "Internal service error"
            // Should NOT contain sensitive information
            body.contains("password") shouldBe false
            body.contains("secret") shouldBe false
            body.contains("API_KEY") shouldBe false
            body.contains("TOKEN") shouldBe false
            body.contains("user:pass") shouldBe false
        }
    }
    
    "should handle timeout scenarios gracefully" {
        testApplication {
            application {
                dependencies {
                    provide<TimeProvider> { SystemTimeProvider() }
                    provide<Database> { TestDatabaseFactory.createTestDatabase() }
                    provide<UnitOfWork> { ExposedUnitOfWork(resolve()) }
                    
                    // Provide a repository that simulates a slow operation
                    provide<ProjectRepository> {
                        object : ProjectRepository {
                            override suspend fun save(project: io.spiralhouse.cycletime.domain.entities.Project) {}
                            override suspend fun findById(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) = null
                            override suspend fun findByStatus(status: io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus) = 
                                emptyList<io.spiralhouse.cycletime.domain.entities.Project>()
                            override suspend fun findAll() = emptyList<io.spiralhouse.cycletime.domain.entities.Project>()
                            override suspend fun delete(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) {}
                            override suspend fun exists(id: io.spiralhouse.cycletime.domain.valueobjects.ProjectId): Boolean {
                                // Simulate slow database query
                                Thread.sleep(100) // Short delay for test
                                return false
                            }
                        }
                    }
                    
                    provide<IssueRepository> { 
                        ExposedIssueRepository(resolve(), resolve())
                    }
                    
                    provide<SessionRepository> { 
                        ExposedSessionRepository(resolve(), resolve())
                    }
                    
                    provide<ProjectApplicationService> {
                        ProjectApplicationService(
                            projectRepository = resolve(),
                            issueRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                    
                    provide<SessionApplicationService> {
                        SessionApplicationService(
                            sessionRepository = resolve(),
                            projectRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                }
                module()
            }
            
            val response = client.get("/health")
            // Should still complete, just slowly
            response.status shouldBe HttpStatusCode.OK
        }
    }
    
    "should return consistent error format for failures" {
        testApplication {
            application {
                // Configure with broken database
                dependencies {
                    provide<TimeProvider> { SystemTimeProvider() }
                    
                    provide<Database> {
                        throw IllegalStateException("Database initialization failed")
                    }
                    
                    provide<UnitOfWork> { 
                        ExposedUnitOfWork(resolve())
                    }
                    
                    provide<ProjectRepository> { 
                        ExposedProjectRepository(resolve(), resolve())
                    }
                    
                    provide<IssueRepository> { 
                        ExposedIssueRepository(resolve(), resolve())
                    }
                    
                    provide<SessionRepository> { 
                        ExposedSessionRepository(resolve(), resolve())
                    }
                    
                    provide<ProjectApplicationService> {
                        ProjectApplicationService(
                            projectRepository = resolve(),
                            issueRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                    
                    provide<SessionApplicationService> {
                        SessionApplicationService(
                            sessionRepository = resolve(),
                            projectRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                }
                module()
            }
            
            val response = client.get("/health")
            response.status shouldBe HttpStatusCode.InternalServerError
            
            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject
            
            // Verify error response structure
            json["status"]?.jsonPrimitive?.content shouldBe "unhealthy"
            json["error"]?.jsonPrimitive?.content shouldBe "Internal service error"
            json["service"]?.jsonPrimitive?.content shouldNotBe null
            json["version"]?.jsonPrimitive?.content shouldNotBe null
            json["timestamp"]?.jsonPrimitive?.content shouldNotBe null
        }
    }
    
    "should handle partial service failures" {
        testApplication {
            application {
                dependencies {
                    provide<TimeProvider> { SystemTimeProvider() }
                    provide<Database> { TestDatabaseFactory.createTestDatabase() }
                    provide<UnitOfWork> { ExposedUnitOfWork(resolve()) }
                    
                    provide<ProjectRepository> { 
                        ExposedProjectRepository(resolve(), resolve())
                    }
                    
                    provide<IssueRepository> { 
                        ExposedIssueRepository(resolve(), resolve())
                    }
                    
                    // Session repository that fails
                    provide<SessionRepository> {
                        object : SessionRepository {
                            override suspend fun save(session: io.spiralhouse.cycletime.domain.entities.Session) {
                                throw RuntimeException("Session service unavailable")
                            }
                            override suspend fun findByKey(sessionKey: io.spiralhouse.cycletime.domain.valueobjects.SessionKey) = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun findByProject(projectId: io.spiralhouse.cycletime.domain.valueobjects.ProjectId) = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun findExpiredSessions(before: kotlinx.datetime.Instant) = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun findAll() = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun findRecentSessions(since: kotlinx.datetime.Instant) = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun count() = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun delete(sessionKey: io.spiralhouse.cycletime.domain.valueobjects.SessionKey) {}
                            override suspend fun deleteExpiredSessions(before: kotlinx.datetime.Instant) = 
                                throw RuntimeException("Session service unavailable")
                            override suspend fun exists(sessionKey: io.spiralhouse.cycletime.domain.valueobjects.SessionKey) = 
                                throw RuntimeException("Session service unavailable")
                        }
                    }
                    
                    provide<ProjectApplicationService> {
                        ProjectApplicationService(
                            projectRepository = resolve(),
                            issueRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                    
                    provide<SessionApplicationService> {
                        SessionApplicationService(
                            sessionRepository = resolve(),
                            projectRepository = resolve(),
                            unitOfWork = resolve(),
                            timeProvider = resolve()
                        )
                    }
                }
                module()
            }
            
            val response = client.get("/health")
            response.status shouldBe HttpStatusCode.InternalServerError
            
            val body = response.bodyAsText()
            body shouldContain "unhealthy"
        }
    }
})