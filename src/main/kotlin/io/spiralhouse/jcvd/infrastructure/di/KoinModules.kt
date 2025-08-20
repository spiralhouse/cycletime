package io.spiralhouse.jcvd.infrastructure.di

import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedSessionRepository
import org.koin.dsl.module

val domainModule = module {
    single<TimeProvider> { SystemTimeProvider() }
}

val infrastructureModule = module {
    single<ProjectRepository> { ExposedProjectRepository() }
    single<IssueRepository> { ExposedIssueRepository() }
    single<SessionRepository> { ExposedSessionRepository() }
}

val applicationModule = module {
    // Application services will be added here
}

val appModule = module {
    includes(domainModule, infrastructureModule, applicationModule)
}
