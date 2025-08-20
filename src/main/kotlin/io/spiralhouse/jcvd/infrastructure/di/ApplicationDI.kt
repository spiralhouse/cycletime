package io.spiralhouse.jcvd.infrastructure.di

import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedSessionRepository
import io.ktor.server.application.*
import io.ktor.util.*

/**
 * Ktor native DI implementation using Application attributes.
 * This replaces Koin with a lightweight manual DI pattern.
 */
object ApplicationDI {
    
    // Dependency registry keys
    val TimeProviderKey = AttributeKey<TimeProvider>("TimeProvider")
    val ProjectRepositoryKey = AttributeKey<ProjectRepository>("ProjectRepository")
    val IssueRepositoryKey = AttributeKey<IssueRepository>("IssueRepository")
    val SessionRepositoryKey = AttributeKey<SessionRepository>("SessionRepository")
    
    /**
     * Configure all dependencies for the application
     */
    fun configureDependencies(application: Application) {
        // Domain services
        application.attributes.put(TimeProviderKey, SystemTimeProvider())
        
        // Infrastructure repositories
        application.attributes.put(ProjectRepositoryKey, ExposedProjectRepository())
        application.attributes.put(IssueRepositoryKey, ExposedIssueRepository())
        application.attributes.put(SessionRepositoryKey, ExposedSessionRepository())
    }
}

// Extension functions for easy dependency resolution
inline fun <reified T : Any> Application.resolve(): T {
    val key = when (T::class) {
        TimeProvider::class -> ApplicationDI.TimeProviderKey
        ProjectRepository::class -> ApplicationDI.ProjectRepositoryKey
        IssueRepository::class -> ApplicationDI.IssueRepositoryKey
        SessionRepository::class -> ApplicationDI.SessionRepositoryKey
        else -> throw IllegalArgumentException("Dependency not registered: ${T::class.simpleName}")
    } as AttributeKey<T>
    
    return attributes[key]
}

// Property delegation support
class DependencyDelegate<T : Any>(private val application: Application, private val clazz: Class<T>) {
    @Suppress("UNCHECKED_CAST")
    operator fun getValue(thisRef: Any?, property: Any?): T {
        val key = when (clazz) {
            TimeProvider::class.java -> ApplicationDI.TimeProviderKey
            ProjectRepository::class.java -> ApplicationDI.ProjectRepositoryKey
            IssueRepository::class.java -> ApplicationDI.IssueRepositoryKey
            SessionRepository::class.java -> ApplicationDI.SessionRepositoryKey
            else -> throw IllegalArgumentException("Dependency not registered: ${clazz.simpleName}")
        } as AttributeKey<T>
        
        return application.attributes[key]
    }
}

inline fun <reified T : Any> Application.dependency(): DependencyDelegate<T> {
    return DependencyDelegate(this, T::class.java)
}