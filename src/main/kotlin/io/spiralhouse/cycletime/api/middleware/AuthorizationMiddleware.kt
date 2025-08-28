package io.spiralhouse.cycletime.api.middleware

import io.ktor.http.*
import io.ktor.server.application.*
// Note: Authentication imports would be added when implementing actual auth
// import io.ktor.server.auth.Principal
// import io.ktor.server.auth.authentication
import io.ktor.server.response.*
import io.spiralhouse.cycletime.api.dto.ErrorResponse
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.ktor.server.application.BaseApplicationPlugin
import io.ktor.server.plugins.di.*
import io.ktor.util.AttributeKey
import org.slf4j.LoggerFactory

/**
 * Authorization middleware for securing API endpoints.
 * 
 * This middleware provides a comprehensive authorization strategy that ensures:
 * - Resource-based access control (RBAC)
 * - Project-level permissions
 * - Issue-level permissions
 * - Rate limiting per user
 * - Audit logging of access attempts
 * 
 * ## Authorization Model
 * 
 * The system uses a hierarchical permission model:
 * 1. **System Admin**: Full access to all resources
 * 2. **Project Owner**: Full access to owned projects
 * 3. **Project Member**: Read/write access to assigned projects
 * 4. **Project Viewer**: Read-only access to assigned projects
 * 5. **Guest**: No access (authentication required)
 * 
 * ## Security Principles
 * 
 * - **Principle of Least Privilege**: Users get minimal required permissions
 * - **Defense in Depth**: Multiple authorization checks at different layers
 * - **Fail Secure**: Default to denying access when uncertain
 * - **Audit Trail**: All authorization decisions are logged
 * 
 * ## Future Enhancements
 * 
 * This is a foundation for future authorization implementation:
 * - OAuth2/JWT token validation
 * - API key authentication for service accounts
 * - Fine-grained permissions (e.g., can-edit-estimates)
 * - Team-based permissions
 * - Time-based access restrictions
 * 
 * @since 1.0.0
 */
object AuthorizationMiddleware {
    
    private val logger = LoggerFactory.getLogger(AuthorizationMiddleware::class.java)
    
    /**
     * Permission levels for resource access.
     */
    enum class Permission {
        NONE,
        READ,
        WRITE,
        ADMIN
    }
    
    /**
     * User roles in the system.
     */
    enum class Role {
        GUEST,
        VIEWER,
        MEMBER,
        OWNER,
        ADMIN
    }
    
    /**
     * Represents an authenticated user principal.
     */
    data class UserPrincipal(
        val id: String,
        val email: String,
        val name: String,
        val role: Role,
        val projectPermissions: Map<ProjectId, Permission> = emptyMap(),
        val rateLimit: RateLimit = RateLimit.default()
    ) // : Principal - uncomment when auth is implemented
    
    /**
     * Rate limiting configuration for a user.
     */
    data class RateLimit(
        val requestsPerMinute: Int,
        val requestsPerHour: Int,
        val burstSize: Int
    ) {
        companion object {
            fun default() = RateLimit(
                requestsPerMinute = 60,
                requestsPerHour = 1000,
                burstSize = 10
            )
            
            fun premium() = RateLimit(
                requestsPerMinute = 300,
                requestsPerHour = 10000,
                burstSize = 50
            )
        }
    }
    
    /**
     * Installs authorization middleware in the application.
     * 
     * This should be called after authentication middleware to ensure
     * users are authenticated before authorization checks.
     */
    fun Application.installAuthorization() {
        // This would integrate with Ktor's authentication plugin
        // For now, it's a placeholder for future implementation
        
        // This would integrate with Ktor's authentication plugin
        // For now, it's a placeholder for future implementation
        // install(Authorization) {
        //     // Configure authorization providers
        // }
    }
    
    /**
     * Checks if a user has permission to access a project.
     * 
     * @param user The authenticated user
     * @param projectId The project to access
     * @param requiredPermission The minimum permission level required
     * @return true if access is allowed, false otherwise
     */
    fun hasProjectAccess(
        user: UserPrincipal,
        projectId: ProjectId,
        requiredPermission: Permission
    ): Boolean {
        // System admins have full access
        if (user.role == Role.ADMIN) {
            logger.debug("Admin access granted to user ${user.id} for project ${projectId.value}")
            return true
        }
        
        // Check project-specific permissions
        val userPermission = user.projectPermissions[projectId] ?: Permission.NONE
        val hasAccess = userPermission.ordinal >= requiredPermission.ordinal
        
        if (!hasAccess) {
            logger.warn("Access denied: User ${user.id} lacks ${requiredPermission} permission for project ${projectId.value}")
        } else {
            logger.debug("Access granted: User ${user.id} has ${userPermission} permission for project ${projectId.value}")
        }
        
        return hasAccess
    }
    
    /**
     * Checks if a user has permission to access an issue.
     * 
     * Issue access is inherited from project permissions.
     * 
     * @param user The authenticated user
     * @param issueProjectId The project the issue belongs to
     * @param requiredPermission The minimum permission level required
     * @return true if access is allowed, false otherwise
     */
    fun hasIssueAccess(
        user: UserPrincipal,
        issueProjectId: ProjectId?,
        requiredPermission: Permission
    ): Boolean {
        // If issue has no project, only admins can access
        if (issueProjectId == null) {
            val hasAccess = user.role == Role.ADMIN
            if (!hasAccess) {
                logger.warn("Access denied: User ${user.id} cannot access orphaned issue (admin only)")
            }
            return hasAccess
        }
        
        // Otherwise, check project permissions
        return hasProjectAccess(user, issueProjectId, requiredPermission)
    }
    
    /**
     * Validates that the current request has the required authorization.
     * 
     * @param call The application call
     * @param permission The required permission level
     * @param resourceType The type of resource being accessed
     * @param resourceId The ID of the resource
     */
    suspend fun ApplicationCall.requireAuthorization(
        permission: Permission,
        resourceType: String,
        resourceId: String? = null
    ) {
        // val principal = authentication.principal<UserPrincipal>()
        val principal: UserPrincipal? = null // Placeholder until auth is implemented
        
        if (principal == null) {
            logger.warn("Unauthorized access attempt to $resourceType${resourceId?.let { " $it" } ?: ""}")
            respondUnauthorized()
            return
        }
        
        // Log the authorization check
        logger.debug("Authorization check: User ${principal?.id ?: "unknown"} requesting $permission access to $resourceType${resourceId?.let { " $it" } ?: ""}")
        
        // In a full implementation, this would check specific resource permissions
        // For now, we'll implement a simple role-based check
        val hasAccess = when (permission) {
            Permission.READ -> principal.role != Role.GUEST
            Permission.WRITE -> principal.role in setOf(Role.MEMBER, Role.OWNER, Role.ADMIN)
            Permission.ADMIN -> principal.role in setOf(Role.OWNER, Role.ADMIN)
            else -> false
        }
        
        if (!hasAccess) {
            logger.warn("Access denied: User ${principal?.id ?: "unknown"} lacks $permission permission for $resourceType${resourceId?.let { " $it" } ?: ""}")
            respondForbidden()
        }
    }
    
    /**
     * Responds with a 401 Unauthorized error.
     */
    private suspend fun ApplicationCall.respondUnauthorized() {
        val timeProvider: TimeProvider by application.dependencies
        respond(
            HttpStatusCode.Unauthorized,
            ErrorResponse(
                error = "Authentication required",
                details = "You must be authenticated to access this resource",
                timestamp = timeProvider.now().toString()
            )
        )
    }
    
    /**
     * Responds with a 403 Forbidden error.
     */
    private suspend fun ApplicationCall.respondForbidden() {
        val timeProvider: TimeProvider by application.dependencies
        respond(
            HttpStatusCode.Forbidden,
            ErrorResponse(
                error = "Access denied",
                details = "You don't have permission to access this resource",
                timestamp = timeProvider.now().toString()
            )
        )
    }
    
    /**
     * Checks rate limiting for the authenticated user.
     * 
     * @param call The application call
     * @return true if the request is within rate limits, false otherwise
     */
    suspend fun ApplicationCall.checkRateLimit(): Boolean {
        // val principal = authentication.principal<UserPrincipal>()
        val principal: UserPrincipal? = null // Placeholder until auth is implemented ?: return true
        
        // In a full implementation, this would track request counts
        // in a time-window cache (e.g., Redis)
        
        // For now, we'll just log the check
        logger.debug("Rate limit check for user ${principal?.id ?: "unknown"}: ${principal?.rateLimit ?: "N/A"}")
        
        return true // Placeholder
    }
    
    /**
     * Logs an authorization decision for audit purposes.
     * 
     * @param user The user making the request
     * @param action The action being performed
     * @param resource The resource being accessed
     * @param allowed Whether access was granted
     * @param reason Optional reason for the decision
     */
    fun auditAuthorizationDecision(
        user: UserPrincipal,
        action: String,
        resource: String,
        allowed: Boolean,
        reason: String? = null
    ) {
        val decision = if (allowed) "ALLOWED" else "DENIED"
        val logMessage = buildString {
            append("AUDIT: $decision - User: ${user.email} (${user.id})")
            append(" | Action: $action")
            append(" | Resource: $resource")
            append(" | Role: ${user.role}")
            reason?.let { append(" | Reason: $it") }
        }
        
        if (allowed) {
            logger.info(logMessage)
        } else {
            logger.warn(logMessage)
        }
    }
}

/**
 * Placeholder for the Authorization feature.
 * 
 * In a full implementation, this would be a proper Ktor feature
 * that integrates with the authentication system.
 */
class Authorization(configuration: Configuration) {
    class Configuration
    
    companion object Plugin : BaseApplicationPlugin<Application, Configuration, Authorization> {
        override val key = AttributeKey<Authorization>("Authorization")
        
        override fun install(
            pipeline: Application,
            configure: Configuration.() -> Unit
        ): Authorization {
            val configuration = Configuration().apply(configure)
            return Authorization(configuration)
        }
    }
}

/**
 * Extension function to get the authenticated user principal.
 */
fun ApplicationCall.userPrincipal(): AuthorizationMiddleware.UserPrincipal? {
    // return authentication.principal<AuthorizationMiddleware.UserPrincipal>()
    return null // Placeholder until auth is implemented
}

/**
 * Extension function to require a specific role.
 */
suspend fun ApplicationCall.requireRole(role: AuthorizationMiddleware.Role) {
    val principal = userPrincipal()
    if (principal == null || principal?.role?.ordinal ?: -1 < role.ordinal) {
        val timeProvider: TimeProvider by application.dependencies
        respond(
            HttpStatusCode.Forbidden,
            ErrorResponse(
                error = "Insufficient permissions",
                details = "This operation requires $role role or higher",
                timestamp = timeProvider.now().toString()
            )
        )
    }
}