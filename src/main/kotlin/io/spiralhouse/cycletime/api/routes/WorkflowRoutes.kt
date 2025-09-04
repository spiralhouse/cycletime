package io.spiralhouse.cycletime.api.routes

import io.ktor.server.application.*
import io.ktor.server.routing.*

/**
 * Workflow REST API Routes (TDD RED Phase - Placeholder Implementation)
 *
 * This file contains placeholder route definitions that will be implemented
 * in the GREEN phase. The routes will initially return 404 Not Found responses
 * until proper implementations are added.
 *
 * Expected REST API Contract:
 * - POST /api/workflows - Create workflow (201 Created)
 * - GET /api/workflows/{id} - Get workflow by ID (200 OK, 404 Not Found)
 * - PUT /api/workflows/{id} - Update workflow (200 OK, 404 Not Found)
 * - DELETE /api/workflows/{id} - Delete workflow (204 No Content, 404 Not Found)
 * - GET /api/workflows - List all workflows (200 OK)
 * - GET /api/workflows/{id}/transitions?status={status} - Get valid transitions (200 OK)
 * - POST /api/workflows/{id}/validate-transition - Validate transition (200 OK)
 * - POST /api/workflows/default - Create default workflow (201 Created)
 * - POST /api/workflows/bug - Create bug workflow (201 Created)
 * - POST /api/workflows/feature - Create feature workflow (201 Created)
 *
 * All endpoints support both /api/workflows and /api/v1/workflows paths.
 */

/**
 * Configures workflow-related routes.
 *
 * This function will be called from the main routing configuration
 * to register all workflow endpoints.
 *
 * @receiver Routing instance to configure routes on
 */
fun Routing.configureWorkflowRoutes() {
    // TDD RED Phase: No route implementations yet
    // Routes will be implemented in GREEN phase to make tests pass
}