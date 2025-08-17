package com.spiralhouse.jcvd.infrastructure.di

import com.spiralhouse.jcvd.domain.repositories.IssueRepository
import com.spiralhouse.jcvd.domain.repositories.ProjectRepository
import com.spiralhouse.jcvd.domain.repositories.SessionRepository
import com.spiralhouse.jcvd.domain.services.SystemTimeProvider
import com.spiralhouse.jcvd.domain.services.TimeProvider
import com.spiralhouse.jcvd.infrastructure.persistence.ExposedIssueRepository
import com.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import com.spiralhouse.jcvd.infrastructure.persistence.ExposedSessionRepository
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