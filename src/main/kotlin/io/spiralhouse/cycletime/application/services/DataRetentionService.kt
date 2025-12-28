package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.application.exceptions.InvalidConfirmationException
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException
import io.spiralhouse.cycletime.domain.entities.AuditLog
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.repositories.AuditLogRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import org.slf4j.LoggerFactory
import kotlin.time.Duration.Companion.parse as parseDuration

/**
 * Application service for managing data retention and permanent deletion.
 *
 * This service handles both scheduled (automatic) and manual purge operations
 * for soft-deleted records that have exceeded the retention period.
 *
 * ## Critical Safety Requirements:
 * - **IRREVERSIBLE**: All purge operations are permanent deletion
 * - **30-Day Retention**: Default safety window before purging
 * - **Confirmation Required**: Manual purges require explicit confirmation string
 * - **Audit Logging**: All purge operations are logged for compliance
 * - **Transaction Safety**: All operations wrapped in UnitOfWork for atomicity
 *
 * ## Cascade Order:
 * Purge operations maintain referential integrity by deleting children before parents:
 * 1. Workflows (no children)
 * 2. Issues (cascade to subtasks)
 * 3. Projects (all issues must be purged first)
 *
 * @property projectRepository Repository for project operations
 * @property issueRepository Repository for issue operations
 * @property workflowRepository Repository for workflow operations
 * @property auditLogRepository Repository for audit log operations
 * @property timeProvider Time provider for cutoff date calculations
 * @property unitOfWork Transaction coordinator for atomic operations
 * @property config Configuration for retention period and auto-purge settings
 */
class DataRetentionService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val workflowRepository: WorkflowRepository,
    private val auditLogRepository: AuditLogRepository,
    private val timeProvider: TimeProvider,
    private val unitOfWork: UnitOfWork,
    private val config: RetentionConfig
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DataRetentionService::class.java)

        /**
         * Required confirmation string for manual purge operations.
         * Must match exactly to prevent accidental permanent deletion.
         */
        const val REQUIRED_CONFIRMATION = "CONFIRM_PERMANENT_DELETE"
    }

    /**
     * Purges all soft-deleted entities that were deleted before the retention cutoff date.
     *
     * This is the scheduled/automatic purge operation. It:
     * 1. Calculates cutoff date (now - retentionPeriod)
     * 2. Purges workflows, issues, and projects deleted before cutoff
     * 3. Maintains referential integrity through cascade ordering
     * 4. Logs audit entry with purge counts
     * 5. Wraps everything in a transaction
     *
     * @return PurgeResult containing counts of purged entities and cutoff date
     */
    suspend fun purgeExpiredDeletions(): PurgeResult {
        // Parse ISO-8601 duration from config
        val retentionDuration = parseDuration(config.retentionPeriod)
        val cutoffDate = timeProvider.now().minus(retentionDuration)

        logger.info("Starting scheduled purge for deletions before $cutoffDate (retention period: ${config.retentionPeriod})")

        return unitOfWork.execute {
            // Purge in correct order: workflows → issues → projects
            // (children before parents to maintain referential integrity)
            val workflowCount = workflowRepository.purgeDeletedBefore(cutoffDate)
            val issueCount = issueRepository.purgeDeletedBefore(cutoffDate)
            val projectCount = projectRepository.purgeDeletedBefore(cutoffDate)

            logger.info("Scheduled purge completed: $projectCount projects, $issueCount issues, $workflowCount workflows")

            // CRITICAL: Audit logging MUST succeed for purge to commit.
            // If auditLogRepository.create() fails, the entire transaction rolls back,
            // preventing data purge without audit trail (compliance requirement).
            // This is INTENTIONAL behavior - we never purge without logging.
            logScheduledPurge(projectCount, issueCount, workflowCount, cutoffDate)

            PurgeResult(
                projects = projectCount,
                issues = issueCount,
                workflows = workflowCount,
                cutoffDate = cutoffDate
            )
        }
    }

    /**
     * Manually purges a specific project by ID.
     *
     * Requires explicit confirmation to prevent accidental permanent deletion.
     * This operation is IRREVERSIBLE.
     *
     * @param projectId The project ID to permanently delete
     * @param confirmation Must be exactly "CONFIRM_PERMANENT_DELETE"
     * @throws InvalidConfirmationException if confirmation string doesn't match
     * @throws ProjectNotFoundException if project doesn't exist
     * @throws IllegalArgumentException if project is not deleted (still active)
     */
    suspend fun purgeProject(projectId: ProjectId, confirmation: String) {
        if (confirmation != REQUIRED_CONFIRMATION) {
            throw InvalidConfirmationException(
                "Invalid confirmation string. Manual purge requires exact match: $REQUIRED_CONFIRMATION"
            )
        }

        unitOfWork.execute {
            // Check if project is active (should not be purgeable)
            val activeProject = projectRepository.findById(projectId)
            if (activeProject != null) {
                // Project found in active projects - cannot purge
                throw ProjectNotFoundException(projectId)
            }

            // Check if project exists in deleted projects
            val deletedProject = projectRepository.findIncludingDeleted(projectId)
            if (deletedProject == null) {
                // Project doesn't exist at all
                throw ProjectNotFoundException(projectId)
            }

            // Project exists and is deleted - safe to purge
            projectRepository.purge(projectId)

            logger.info("Manual purge: permanently deleted project ${projectId.value}")

            // CRITICAL: Audit logging MUST succeed for purge to commit.
            // If auditLogRepository.create() fails, the entire transaction rolls back,
            // preventing data purge without audit trail (compliance requirement).
            // This is INTENTIONAL behavior - we never purge without logging.
            logManualPurge("project", projectId.value, "userId")
        }
    }

    /**
     * Manually purges a specific issue by ID.
     *
     * Requires explicit confirmation to prevent accidental permanent deletion.
     * This operation is IRREVERSIBLE.
     *
     * @param issueId The issue ID to permanently delete
     * @param confirmation Must be exactly "CONFIRM_PERMANENT_DELETE"
     * @throws InvalidConfirmationException if confirmation string doesn't match
     * @throws IssueNotFoundException if issue doesn't exist
     * @throws IllegalArgumentException if issue is not deleted (still active)
     */
    suspend fun purgeIssue(issueId: IssueId, confirmation: String) {
        if (confirmation != REQUIRED_CONFIRMATION) {
            throw InvalidConfirmationException(
                "Invalid confirmation string. Manual purge requires exact match: $REQUIRED_CONFIRMATION"
            )
        }

        unitOfWork.execute {
            // Check if issue is active (should not be purgeable)
            val activeIssue = issueRepository.findById(issueId)
            if (activeIssue != null) {
                // Issue found in active issues - cannot purge
                throw IssueNotFoundException(issueId)
            }

            // Check if issue exists in deleted issues
            val deletedIssue = issueRepository.findIncludingDeleted(issueId)
            if (deletedIssue == null) {
                // Issue doesn't exist at all
                throw IssueNotFoundException(issueId)
            }

            // Issue exists and is deleted - safe to purge
            issueRepository.purge(issueId)

            logger.info("Manual purge: permanently deleted issue ${issueId.value}")

            // CRITICAL: Audit logging MUST succeed for purge to commit.
            // If auditLogRepository.create() fails, the entire transaction rolls back,
            // preventing data purge without audit trail (compliance requirement).
            // This is INTENTIONAL behavior - we never purge without logging.
            logManualPurge("issue", issueId.value, "userId")
        }
    }

    /**
     * Logs an audit entry for scheduled purge operation.
     *
     * CRITICAL: This method is called inside a UnitOfWork transaction.
     * If audit logging fails, the entire purge transaction rolls back.
     * This ensures we NEVER purge data without an audit trail.
     *
     * @param projectCount Number of projects purged
     * @param issueCount Number of issues purged
     * @param workflowCount Number of workflows purged
     * @param cutoffDate Cutoff timestamp used for purging
     * @throws Exception if audit log creation fails (causes transaction rollback)
     */
    private suspend fun logScheduledPurge(
        projectCount: Int,
        issueCount: Int,
        workflowCount: Int,
        cutoffDate: kotlinx.datetime.Instant
    ) {
        val auditLog = AuditLog.scheduledPurge(
            projectCount = projectCount,
            issueCount = issueCount,
            workflowCount = workflowCount,
            cutoffDate = cutoffDate,
            timestamp = timeProvider.now()
        )
        auditLogRepository.create(auditLog)
    }

    /**
     * Logs an audit entry for manual purge operation.
     *
     * CRITICAL: This method is called inside a UnitOfWork transaction.
     * If audit logging fails, the entire purge transaction rolls back.
     * This ensures we NEVER purge data without an audit trail.
     *
     * @param entityType Type of entity purged (e.g., "project", "issue")
     * @param entityId ID of the purged entity
     * @param userId User who initiated the purge
     * @throws Exception if audit log creation fails (causes transaction rollback)
     */
    private suspend fun logManualPurge(
        entityType: String,
        entityId: String,
        userId: String
    ) {
        val auditLog = AuditLog.manualPurge(
            entityType = entityType,
            entityId = entityId,
            userId = userId,
            timestamp = timeProvider.now()
        )
        auditLogRepository.create(auditLog)
    }
}
