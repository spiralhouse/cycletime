#!/usr/bin/env kotlin

// Simple test to verify hierarchy validation
import io.spiralhouse.cycletime.domain.valueobjects.IssueType

fun main() {
    println("=== Testing IssueType.canHaveParent ===")
    
    // Test: Can SUBTASK have EPIC parent?
    val subtaskCanHaveEpicParent = IssueType.SUBTASK.canHaveParent(IssueType.EPIC)
    println("SUBTASK.canHaveParent(EPIC) = $subtaskCanHaveEpicParent")
    
    // Test: Can SUBTASK have STORY parent?
    val subtaskCanHaveStoryParent = IssueType.SUBTASK.canHaveParent(IssueType.STORY)
    println("SUBTASK.canHaveParent(STORY) = $subtaskCanHaveStoryParent")
    
    // Test: Can SUBTASK have null parent?
    val subtaskCanHaveNullParent = IssueType.SUBTASK.canHaveParent(null)
    println("SUBTASK.canHaveParent(null) = $subtaskCanHaveNullParent")
    
    println()
    println("Expected: EPIC=false, STORY=true, null=false")
    println("If EPIC=true, that's the bug!")
}