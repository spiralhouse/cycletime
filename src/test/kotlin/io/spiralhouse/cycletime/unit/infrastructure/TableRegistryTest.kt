package io.spiralhouse.cycletime.unit.infrastructure

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.infrastructure.database.*

/**
 * Unit tests for TableRegistry to ensure compile-time safety.
 *
 * These tests verify that:
 * 1. All tables are registered
 * 2. Tables are in correct dependency order
 * 3. No duplicate tables exist
 */
class TableRegistryTest : StringSpec({

    "should contain all defined tables" {
        // Verify all expected tables are registered
        TableRegistry.ALL_TABLES shouldHaveSize 6

        // Verify each table is present
        TableRegistry.ALL_TABLES shouldContain ProjectsTable
        TableRegistry.ALL_TABLES shouldContain IssuesTable
        TableRegistry.ALL_TABLES shouldContain IssueDependenciesTable
        TableRegistry.ALL_TABLES shouldContain IssueLabelsTable
        TableRegistry.ALL_TABLES shouldContain SessionStatesTable
        TableRegistry.ALL_TABLES shouldContain WorkflowsTable
    }

    "should maintain correct dependency order" {
        val tables = TableRegistry.ALL_TABLES
        val tableNames = tables.map { it.tableName }

        // ProjectsTable should come before tables that reference it
        val projectsIndex = tableNames.indexOf("projects")
        val issuesIndex = tableNames.indexOf("issues")
        val sessionStatesIndex = tableNames.indexOf("session_states")

        (projectsIndex < issuesIndex) shouldBe true
        (projectsIndex < sessionStatesIndex) shouldBe true

        // IssuesTable should come before tables that reference it
        val issueDependenciesIndex = tableNames.indexOf("issue_dependencies")
        val issueLabelsIndex = tableNames.indexOf("issue_labels")

        (issuesIndex < issueDependenciesIndex) shouldBe true
        (issuesIndex < issueLabelsIndex) shouldBe true

        // WorkflowsTable has no dependencies, can be anywhere
        tableNames shouldContain "workflows"
    }

    "should validate with no duplicates" {
        // This should not throw
        TableRegistry.validate()
    }

    "should include WorkflowsTable in registry" {
        // Specific test to ensure the fix for SPI-624 is maintained
        val tableNames = TableRegistry.ALL_TABLES.map { it.tableName }
        tableNames shouldContain "workflows"

        // Verify WorkflowsTable is actually in the list
        TableRegistry.ALL_TABLES.any { it === WorkflowsTable } shouldBe true
    }
})