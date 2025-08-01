/**
 * JCVD Schema Versioning System
 * Comprehensive semantic versioning support for database schema evolution
 */

import { SemanticVersion, SchemaSnapshot, SchemaComparison } from './migration-types'

// =============================================================================
// Semantic Version Utilities
// =============================================================================

/**
 * Parse a semantic version string into components
 */
export function parseSemanticVersion(versionString: string): SemanticVersion {
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-\.]+))?(?:\+([a-zA-Z0-9\-\.]+))?$/
  const match = versionString.match(versionRegex)
  
  if (!match) {
    throw new Error(`Invalid semantic version format: ${versionString}. Expected: MAJOR.MINOR.PATCH[-prerelease][+build]`)
  }
  
  const [, major, minor, patch, prerelease, build] = match
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease || undefined,
    build: build || undefined
  }
}

/**
 * Convert semantic version object to string
 */
export function formatSemanticVersion(version: SemanticVersion): string {
  let versionString = `${version.major}.${version.minor}.${version.patch}`
  
  if (version.prerelease) {
    versionString += `-${version.prerelease}`
  }
  
  if (version.build) {
    versionString += `+${version.build}`
  }
  
  return versionString
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemanticVersions(a: SemanticVersion, b: SemanticVersion): number {
  // Compare major version
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1
  }
  
  // Compare minor version
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1
  }
  
  // Compare patch version
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1
  }
  
  // Compare prerelease versions
  if (a.prerelease && !b.prerelease) {
    return -1 // Prerelease versions have lower precedence
  }
  
  if (!a.prerelease && b.prerelease) {
    return 1
  }
  
  if (a.prerelease && b.prerelease) {
    return comparePrerelease(a.prerelease, b.prerelease)
  }
  
  // Build metadata should be ignored for precedence
  return 0
}

/**
 * Compare prerelease versions according to semantic versioning rules
 */
function comparePrerelease(a: string, b: string): number {
  const aParts = a.split('.')
  const bParts = b.split('.')
  const maxLength = Math.max(aParts.length, bParts.length)
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i]
    const bPart = bParts[i]
    
    // Missing parts are considered lower
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    
    // Numeric comparison if both are numbers
    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) {
        return aNum < bNum ? -1 : 1
      }
    } else {
      // Numeric identifiers have lower precedence than non-numeric
      if (!isNaN(aNum) && isNaN(bNum)) return -1
      if (isNaN(aNum) && !isNaN(bNum)) return 1
      
      // Lexical comparison for non-numeric parts
      if (aPart !== bPart) {
        return aPart < bPart ? -1 : 1
      }
    }
  }
  
  return 0
}

/**
 * Check if version a is greater than version b
 */
export function isVersionGreater(a: SemanticVersion, b: SemanticVersion): boolean {
  return compareSemanticVersions(a, b) > 0
}

/**
 * Check if version a is less than version b
 */
export function isVersionLess(a: SemanticVersion, b: SemanticVersion): boolean {
  return compareSemanticVersions(a, b) < 0
}

/**
 * Check if versions are equal
 */
export function isVersionEqual(a: SemanticVersion, b: SemanticVersion): boolean {
  return compareSemanticVersions(a, b) === 0
}

/**
 * Check if version a is compatible with version b (same major version)
 */
export function isVersionCompatible(a: SemanticVersion, b: SemanticVersion): boolean {
  return a.major === b.major
}

/**
 * Get the next version for a given change type
 */
export function getNextVersion(
  currentVersion: SemanticVersion, 
  changeType: 'major' | 'minor' | 'patch',
  prerelease?: string
): SemanticVersion {
  const nextVersion: SemanticVersion = { ...currentVersion }
  
  switch (changeType) {
    case 'major':
      nextVersion.major += 1
      nextVersion.minor = 0
      nextVersion.patch = 0
      break
    case 'minor':
      nextVersion.minor += 1
      nextVersion.patch = 0
      break
    case 'patch':
      nextVersion.patch += 1
      break
  }
  
  // Reset prerelease and build for non-prerelease versions
  if (!prerelease) {
    nextVersion.prerelease = undefined
    nextVersion.build = undefined
  } else {
    nextVersion.prerelease = prerelease
  }
  
  return nextVersion
}

// =============================================================================
// Schema Version Management
// =============================================================================

export interface SchemaVersionInfo {
  version: SemanticVersion
  description: string
  migrationCount: number
  activatedAt?: Date
  deactivatedAt?: Date
  isCurrent: boolean
  snapshotCount: number
}

export interface SchemaVersionManager {
  getCurrentVersion(): Promise<SemanticVersion>
  getAllVersions(): Promise<SchemaVersionInfo[]>
  setCurrentVersion(version: SemanticVersion): Promise<void>
  createVersion(version: SemanticVersion, description: string): Promise<void>
  deleteVersion(version: SemanticVersion): Promise<void>
  getVersionHistory(): Promise<SchemaVersionInfo[]>
  findCompatibleVersions(targetVersion: SemanticVersion): Promise<SemanticVersion[]>
}

/**
 * Version range specification for compatibility checking
 */
export interface VersionRange {
  operator: '>=' | '>' | '<=' | '<' | '=' | '~' | '^'
  version: SemanticVersion
}

/**
 * Parse version range string (e.g., ">=1.2.0", "~1.2.3", "^2.0.0")
 */
export function parseVersionRange(rangeString: string): VersionRange {
  // Match operators and version
  const rangeRegex = /^(>=|>|<=|<|=|~|\^)?(.+)$/
  const match = rangeString.match(rangeRegex)
  
  if (!match) {
    throw new Error(`Invalid version range format: ${rangeString}`)
  }
  
  const [, operator = '=', versionString] = match
  const version = parseSemanticVersion(versionString)
  
  return {
    operator: operator as VersionRange['operator'],
    version
  }
}

/**
 * Check if a version satisfies a version range
 */
export function satisfiesRange(version: SemanticVersion, range: VersionRange): boolean {
  const comparison = compareSemanticVersions(version, range.version)
  
  switch (range.operator) {
    case '>=':
      return comparison >= 0
    case '>':
      return comparison > 0
    case '<=':
      return comparison <= 0
    case '<':
      return comparison < 0
    case '=':
      return comparison === 0
    case '~':
      // Tilde range: ~1.2.3 := >=1.2.3 <1.(2+1).0
      return version.major === range.version.major &&
             version.minor === range.version.minor &&
             version.patch >= range.version.patch
    case '^':
      // Caret range: ^1.2.3 := >=1.2.3 <2.0.0
      if (range.version.major === 0) {
        // Special handling for 0.x.x versions
        if (range.version.minor === 0) {
          // 0.0.x - only patch changes allowed
          return version.major === 0 && 
                 version.minor === 0 && 
                 version.patch >= range.version.patch
        } else {
          // 0.x.y - minor and patch changes allowed within same minor
          return version.major === 0 && 
                 version.minor === range.version.minor && 
                 version.patch >= range.version.patch
        }
      } else {
        // x.y.z - compatible changes within same major version
        return version.major === range.version.major &&
               compareSemanticVersions(version, range.version) >= 0
      }
    default:
      throw new Error(`Unknown version range operator: ${range.operator}`)
  }
}

// =============================================================================
// Schema Change Analysis
// =============================================================================

/**
 * Analyze schema changes between two versions
 */
export function analyzeSchemaChanges(
  fromVersion: SemanticVersion, 
  toVersion: SemanticVersion
): 'major' | 'minor' | 'patch' | 'none' {
  const comparison = compareSemanticVersions(fromVersion, toVersion)
  
  if (comparison === 0) {
    return 'none'
  }
  
  if (toVersion.major > fromVersion.major) {
    return 'major'
  }
  
  if (toVersion.minor > fromVersion.minor) {
    return 'minor'
  }
  
  if (toVersion.patch > fromVersion.patch) {
    return 'patch'
  }
  
  // If we're here, we're going backward in versions
  throw new Error(`Cannot analyze changes from ${formatSemanticVersion(fromVersion)} to ${formatSemanticVersion(toVersion)}: target version is older`)
}

/**
 * Determine appropriate version bump based on schema changes
 */
export function determineVersionBump(schemaComparison: SchemaComparison): 'major' | 'minor' | 'patch' {
  // Breaking changes require major version bump
  if (
    schemaComparison.removed_tables.length > 0 ||
    schemaComparison.removed_indexes.length > 0 ||
    schemaComparison.removed_triggers.length > 0 ||
    schemaComparison.modified_tables.some(table => 
      table.removed_columns.length > 0 ||
      table.removed_constraints.length > 0 ||
      table.modified_columns.some(col => 
        col.modification_type === 'type_change' ||
        (col.modification_type === 'nullable_change' && !col.new_definition.nullable)
      )
    )
  ) {
    return 'major'
  }
  
  // New features require minor version bump
  if (
    schemaComparison.added_tables.length > 0 ||
    schemaComparison.modified_tables.some(table => 
      table.added_columns.length > 0 ||
      table.added_constraints.length > 0
    )
  ) {
    return 'minor'
  }
  
  // Other changes are patches (indexes, triggers, constraints that don't affect data)
  if (
    schemaComparison.added_indexes.length > 0 ||
    schemaComparison.added_triggers.length > 0 ||
    schemaComparison.modified_tables.some(table => 
      table.modified_columns.some(col => 
        col.modification_type === 'default_change' ||
        (col.modification_type === 'nullable_change' && col.new_definition.nullable)
      )
    )
  ) {
    return 'patch'
  }
  
  // No changes detected
  return 'patch' // Default to patch for safety
}

// =============================================================================
// Schema Fingerprinting
// =============================================================================

/**
 * Generate a fingerprint/checksum for schema validation
 */
export function generateSchemaFingerprint(schemaDDL: string): string {
  // Normalize schema DDL for consistent fingerprinting
  const normalizedDDL = normalizeSchemaForFingerprinting(schemaDDL)
  
  // Simple hash function (in production, use crypto.createHash)
  return simpleHash(normalizedDDL)
}

/**
 * Normalize schema DDL for consistent fingerprinting
 */
function normalizeSchemaForFingerprinting(ddl: string): string {
  return ddl
    // Remove comments
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove trailing semicolons and whitespace
    .replace(/;\s*$/, '')
    // Convert to lowercase for case-insensitive comparison
    .toLowerCase()
    .trim()
}

/**
 * Simple hash function for demonstration (use crypto in production)
 */
function simpleHash(input: string): string {
  let hash = 0
  if (input.length === 0) return hash.toString()
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16)
}

// =============================================================================
// Version Validation
// =============================================================================

/**
 * Validate that a version string is a valid semantic version
 */
export function validateSemanticVersion(versionString: string): boolean {
  try {
    parseSemanticVersion(versionString)
    return true
  } catch {
    return false
  }
}

/**
 * Validate version progression (ensure new version is valid progression from current)
 */
export function validateVersionProgression(
  currentVersion: SemanticVersion, 
  newVersion: SemanticVersion
): { isValid: boolean, reason?: string } {
  // Can't go backwards in major versions
  if (newVersion.major < currentVersion.major) {
    return { 
      isValid: false, 
      reason: `Cannot downgrade major version from ${currentVersion.major} to ${newVersion.major}` 
    }
  }
  
  // Within same major version, can't go backwards in minor versions
  if (newVersion.major === currentVersion.major && newVersion.minor < currentVersion.minor) {
    return { 
      isValid: false, 
      reason: `Cannot downgrade minor version from ${currentVersion.minor} to ${newVersion.minor}` 
    }
  }
  
  // Within same major.minor, can't go backwards in patch versions
  if (
    newVersion.major === currentVersion.major && 
    newVersion.minor === currentVersion.minor && 
    newVersion.patch < currentVersion.patch
  ) {
    return { 
      isValid: false, 
      reason: `Cannot downgrade patch version from ${currentVersion.patch} to ${newVersion.patch}` 
    }
  }
  
  // Version progression is valid
  return { isValid: true }
}

// =============================================================================
// Export all utilities
// =============================================================================

export const SchemaVersioning = {
  // Version parsing and formatting
  parse: parseSemanticVersion,
  format: formatSemanticVersion,
  
  // Version comparison
  compare: compareSemanticVersions,
  isGreater: isVersionGreater,
  isLess: isVersionLess,
  isEqual: isVersionEqual,
  isCompatible: isVersionCompatible,
  
  // Version manipulation
  getNext: getNextVersion,
  
  // Range handling
  parseRange: parseVersionRange,
  satisfies: satisfiesRange,
  
  // Change analysis
  analyzeChanges: analyzeSchemaChanges,
  determineVersionBump,
  
  // Validation
  validate: validateSemanticVersion,
  validateProgression: validateVersionProgression,
  
  // Fingerprinting
  generateFingerprint: generateSchemaFingerprint
}