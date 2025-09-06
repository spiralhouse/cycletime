package io.spiralhouse.cycletime.application.dto

/**
 * Data Transfer Object representing an issue hierarchy tree.
 *
 * This DTO represents a complete issue hierarchy with an issue node
 * and its child issue trees recursively. Used for retrieving and
 * displaying issue hierarchies in a tree structure.
 *
 * @property issue The issue at this tree node
 * @property children List of child issue trees
 */
data class IssueTreeDto(
    val issue: IssueDto,
    val children: List<IssueTreeDto>
)