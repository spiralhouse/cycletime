# Changelog

All notable changes to CycleTime will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2025-XX-XX

### Changed (Breaking Behavior)
- **Deletion now soft-deletes** instead of permanently removing records
- `deleteProject()` and `deleteIssue()` set `deleted_at` timestamp instead of removing data
- Deleted items excluded from default list/query operations
- Items recoverable for 30 days before automatic purge (SPI-880, future release)

### Added

#### Application Services
- `restoreProject()` - Recover soft-deleted projects
- `restoreIssue()` - Recover soft-deleted issues (validates parent not deleted)
- `findDeletedProjects()` - Query soft-deleted projects
- `findDeletedIssues()` - Query soft-deleted issues
- `includeDeleted` parameter on list operations

#### MCP Tools
- `cycletime_restore_project` - Restore soft-deleted project
- `cycletime_restore_issue` - Restore soft-deleted issue
- `cycletime_project_list_deleted` - List deleted projects
- `cycletime_issue_list_deleted` - List deleted issues
- Updated `cycletime_list_projects` with `includeDeleted` parameter
- Updated `cycletime_list_issues` with `includeDeleted` parameter

### Migration Guide

#### For Existing Users
- Existing delete operations automatically use soft-deletion (no code changes required)
- Deleted items still hidden from default queries (backward compatible)
- New restore methods available for accidental deletion recovery
- Soft-deleted items auto-purge after 30 days (future: SPI-880)

#### Behavior Change Timeline
- **SPI-878 (deployed)**: Deletion behavior changed to soft-delete
- **SPI-879 (deployed)**: MCP tools expose restore functionality
- **SPI-880 (future)**: Automatic 30-day purge activates

**Note:** Brief window between SPI-878 and SPI-879 where deletion soft-deleted but restore not yet exposed. Duration: days, not weeks.

#### API Usage Examples

**Soft-delete a project (automatic with delete operation):**
```javascript
// Old behavior: permanent delete
// New behavior: sets deleted_at timestamp
await cycletimeClient.deleteProject(projectId);
```

**Restore a soft-deleted project:**
```javascript
// New capability - recover deleted project
await cycletimeClient.restoreProject(projectId);
```

**List deleted items:**
```javascript
// Find all soft-deleted projects
const deletedProjects = await cycletimeClient.listDeletedProjects();

// Include deleted items in standard queries
const allProjects = await cycletimeClient.listProjects({ includeDeleted: true });
```

#### Database Migration

For direct database users:

1. **Schema changes** (automatically applied):
   - Added `deleted_at TIMESTAMP` column to projects and issues tables
   - Created composite indexes on `(deleted_at, id)` for performance

2. **Query updates required**:
   ```sql
   -- Old query
   SELECT * FROM projects;

   -- New query (exclude deleted)
   SELECT * FROM projects WHERE deleted_at IS NULL;

   -- Query including deleted
   SELECT * FROM projects; -- All records including soft-deleted
   ```

3. **Restoration query**:
   ```sql
   -- Restore a project
   UPDATE projects SET deleted_at = NULL WHERE id = ?;

   -- Must validate parent not deleted for issues
   UPDATE issues SET deleted_at = NULL
   WHERE id = ? AND project_id IN (
     SELECT id FROM projects WHERE deleted_at IS NULL
   );
   ```

### Fixed
- Issue where permanent deletion could not be undone
- Loss of audit trail when items were deleted
- Cascade deletion breaking referential integrity

### Security
- Soft-deleted items remain access-controlled
- Restoration requires same permissions as creation
- Deleted data encrypted at rest during retention period

## [1.4.0] - 2024-11-15

### Added
- MCP Kotlin SDK v0.7.6 integration
- Native Ktor dependency injection
- H2 database migration from SQLite

### Changed
- Replaced custom EventBus transport with official SDK
- Improved session management architecture

### Fixed
- Connection stability issues with MCP transport
- Memory leaks in long-running sessions

## [1.3.0] - 2024-10-01

### Added
- Linear integration for issue management
- Workflow orchestration system
- Domain-driven design architecture

### Changed
- Refactored to use Exposed ORM
- Improved error handling across all layers

### Deprecated
- Legacy SQLite direct queries (use Exposed ORM)

### Removed
- Custom ORM implementation

## [1.2.0] - 2024-08-15

### Added
- Project management capabilities
- Issue hierarchy (Epic → Story → Subtask)
- Session persistence

### Fixed
- Database connection pooling issues
- Concurrent session access problems

## [1.1.0] - 2024-07-01

### Added
- Basic MCP server implementation
- SQLite database integration
- Core domain models

## [1.0.0] - 2024-06-01

### Added
- Initial release
- Project structure
- Basic functionality

[Unreleased]: https://github.com/spiralhouse/cycletime/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/spiralhouse/cycletime/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/spiralhouse/cycletime/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/spiralhouse/cycletime/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/spiralhouse/cycletime/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/spiralhouse/cycletime/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/spiralhouse/cycletime/releases/tag/v1.0.0