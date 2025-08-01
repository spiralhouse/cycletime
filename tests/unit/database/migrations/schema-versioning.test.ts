/**
 * Unit tests for Schema Versioning System
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SchemaVersioning,
  parseSemanticVersion,
  formatSemanticVersion,
  compareSemanticVersions,
  isVersionGreater,
  isVersionLess,
  isVersionEqual,
  isVersionCompatible,
  getNextVersion,
  parseVersionRange,
  satisfiesRange,
  analyzeSchemaChanges,
  determineVersionBump,
  validateSemanticVersion,
  validateVersionProgression,
  generateSchemaFingerprint
} from '../../../../src/database/migrations/schema-versioning'

import { SemanticVersion } from '../../../../src/database/migrations/migration-types'

describe('Schema Versioning System', () => {
  describe('parseSemanticVersion', () => {
    it('should parse valid semantic versions', () => {
      const testCases = [
        { input: '1.2.3', expected: { major: 1, minor: 2, patch: 3 } },
        { input: '0.0.1', expected: { major: 0, minor: 0, patch: 1 } },
        { input: '10.20.30', expected: { major: 10, minor: 20, patch: 30 } },
        { input: '1.2.3-alpha', expected: { major: 1, minor: 2, patch: 3, prerelease: 'alpha' } },
        { input: '1.2.3-beta.1', expected: { major: 1, minor: 2, patch: 3, prerelease: 'beta.1' } },
        { input: '1.2.3+build.1', expected: { major: 1, minor: 2, patch: 3, build: 'build.1' } },
        { input: '1.2.3-alpha+build', expected: { major: 1, minor: 2, patch: 3, prerelease: 'alpha', build: 'build' } }
      ]
      
      for (const testCase of testCases) {
        const result = parseSemanticVersion(testCase.input)
        expect(result).toEqual(testCase.expected)
      }
    })
    
    it('should throw error for invalid versions', () => {
      const invalidVersions = [
        '1.2',
        '1.2.3.4',
        'invalid',
        '',
        '1.2.x',
        'v1.2.3'
      ]
      
      for (const invalid of invalidVersions) {
        expect(() => parseSemanticVersion(invalid)).toThrow()
      }
    })
  })
  
  describe('formatSemanticVersion', () => {
    it('should format semantic versions correctly', () => {
      const testCases = [
        { input: { major: 1, minor: 2, patch: 3 }, expected: '1.2.3' },
        { input: { major: 1, minor: 2, patch: 3, prerelease: 'alpha' }, expected: '1.2.3-alpha' },
        { input: { major: 1, minor: 2, patch: 3, build: 'build.1' }, expected: '1.2.3+build.1' },
        { input: { major: 1, minor: 2, patch: 3, prerelease: 'alpha', build: 'build' }, expected: '1.2.3-alpha+build' }
      ]
      
      for (const testCase of testCases) {
        const result = formatSemanticVersion(testCase.input)
        expect(result).toBe(testCase.expected)
      }
    })
  })
  
  describe('compareSemanticVersions', () => {
    it('should compare versions correctly', () => {
      const testCases = [
        { a: '1.0.0', b: '2.0.0', expected: -1 },
        { a: '2.0.0', b: '1.0.0', expected: 1 },
        { a: '1.0.0', b: '1.0.0', expected: 0 },
        { a: '1.1.0', b: '1.0.0', expected: 1 },
        { a: '1.0.1', b: '1.0.0', expected: 1 },
        { a: '1.0.0-alpha', b: '1.0.0', expected: -1 },
        { a: '1.0.0-alpha', b: '1.0.0-beta', expected: -1 },
        { a: '1.0.0-alpha.1', b: '1.0.0-alpha.2', expected: -1 },
        { a: '1.0.0+build.1', b: '1.0.0+build.2', expected: 0 } // build metadata ignored
      ]
      
      for (const testCase of testCases) {
        const a = parseSemanticVersion(testCase.a)
        const b = parseSemanticVersion(testCase.b)
        const result = compareSemanticVersions(a, b)
        expect(result).toBe(testCase.expected)
      }
    })
  })
  
  describe('version comparison helpers', () => {
    const v1_0_0 = parseSemanticVersion('1.0.0')
    const v1_1_0 = parseSemanticVersion('1.1.0')
    const v2_0_0 = parseSemanticVersion('2.0.0')
    
    it('should check if version is greater', () => {
      expect(isVersionGreater(v1_1_0, v1_0_0)).toBe(true)
      expect(isVersionGreater(v1_0_0, v1_1_0)).toBe(false)
      expect(isVersionGreater(v1_0_0, v1_0_0)).toBe(false)
    })
    
    it('should check if version is less', () => {
      expect(isVersionLess(v1_0_0, v1_1_0)).toBe(true)
      expect(isVersionLess(v1_1_0, v1_0_0)).toBe(false)
      expect(isVersionLess(v1_0_0, v1_0_0)).toBe(false)
    })
    
    it('should check if versions are equal', () => {
      expect(isVersionEqual(v1_0_0, v1_0_0)).toBe(true)
      expect(isVersionEqual(v1_0_0, v1_1_0)).toBe(false)
    })
    
    it('should check version compatibility', () => {
      expect(isVersionCompatible(v1_0_0, v1_1_0)).toBe(true)
      expect(isVersionCompatible(v1_0_0, v2_0_0)).toBe(false)
    })
  })
  
  describe('getNextVersion', () => {
    const currentVersion = parseSemanticVersion('1.2.3')
    
    it('should increment major version', () => {
      const next = getNextVersion(currentVersion, 'major')
      expect(formatSemanticVersion(next)).toBe('2.0.0')
    })
    
    it('should increment minor version', () => {
      const next = getNextVersion(currentVersion, 'minor')
      expect(formatSemanticVersion(next)).toBe('1.3.0')
    })
    
    it('should increment patch version', () => {
      const next = getNextVersion(currentVersion, 'patch')
      expect(formatSemanticVersion(next)).toBe('1.2.4')
    })
    
    it('should handle prerelease versions', () => {
      const next = getNextVersion(currentVersion, 'minor', 'alpha')
      expect(formatSemanticVersion(next)).toBe('1.3.0-alpha')
    })
  })
  
  describe('parseVersionRange', () => {
    it('should parse version ranges correctly', () => {
      const testCases = [
        { input: '1.2.3', expected: { operator: '=', version: parseSemanticVersion('1.2.3') } },
        { input: '>=1.2.3', expected: { operator: '>=', version: parseSemanticVersion('1.2.3') } },
        { input: '>1.2.3', expected: { operator: '>', version: parseSemanticVersion('1.2.3') } },
        { input: '<=1.2.3', expected: { operator: '<=', version: parseSemanticVersion('1.2.3') } },
        { input: '<1.2.3', expected: { operator: '<', version: parseSemanticVersion('1.2.3') } },
        { input: '~1.2.3', expected: { operator: '~', version: parseSemanticVersion('1.2.3') } },
        { input: '^1.2.3', expected: { operator: '^', version: parseSemanticVersion('1.2.3') } }
      ]
      
      for (const testCase of testCases) {
        const result = parseVersionRange(testCase.input)
        expect(result.operator).toBe(testCase.expected.operator)
        expect(formatSemanticVersion(result.version)).toBe(formatSemanticVersion(testCase.expected.version))
      }
    })
  })
  
  describe('satisfiesRange', () => {
    it('should check range satisfaction correctly', () => {
      const testCases = [
        { version: '1.2.3', range: '=1.2.3', expected: true },
        { version: '1.2.4', range: '=1.2.3', expected: false },
        { version: '1.2.4', range: '>=1.2.3', expected: true },
        { version: '1.2.2', range: '>=1.2.3', expected: false },
        { version: '1.2.4', range: '>1.2.3', expected: true },
        { version: '1.2.3', range: '>1.2.3', expected: false },
        { version: '1.2.2', range: '<=1.2.3', expected: true },
        { version: '1.2.4', range: '<=1.2.3', expected: false },
        { version: '1.2.2', range: '<1.2.3', expected: true },
        { version: '1.2.3', range: '<1.2.3', expected: false },
        { version: '1.2.5', range: '~1.2.3', expected: true },
        { version: '1.3.0', range: '~1.2.3', expected: false },
        { version: '1.5.0', range: '^1.2.3', expected: true },
        { version: '2.0.0', range: '^1.2.3', expected: false }
      ]
      
      for (const testCase of testCases) {
        const version = parseSemanticVersion(testCase.version)
        const range = parseVersionRange(testCase.range)
        const result = satisfiesRange(version, range)
        expect(result).toBe(testCase.expected)
      }
    })
  })
  
  describe('analyzeSchemaChanges', () => {
    it('should analyze schema changes correctly', () => {
      const testCases = [
        { from: '1.0.0', to: '2.0.0', expected: 'major' },
        { from: '1.0.0', to: '1.1.0', expected: 'minor' },
        { from: '1.0.0', to: '1.0.1', expected: 'patch' },
        { from: '1.0.0', to: '1.0.0', expected: 'none' }
      ]
      
      for (const testCase of testCases) {
        const from = parseSemanticVersion(testCase.from)
        const to = parseSemanticVersion(testCase.to)
        const result = analyzeSchemaChanges(from, to)
        expect(result).toBe(testCase.expected)
      }
    })
    
    it('should throw error for backward version analysis', () => {
      const from = parseSemanticVersion('2.0.0')
      const to = parseSemanticVersion('1.0.0')
      expect(() => analyzeSchemaChanges(from, to)).toThrow()
    })
  })
  
  describe('validateSemanticVersion', () => {
    it('should validate version strings', () => {
      expect(validateSemanticVersion('1.2.3')).toBe(true)
      expect(validateSemanticVersion('1.2.3-alpha')).toBe(true)
      expect(validateSemanticVersion('1.2.3+build')).toBe(true)
      expect(validateSemanticVersion('invalid')).toBe(false)
      expect(validateSemanticVersion('1.2')).toBe(false)
    })
  })
  
  describe('validateVersionProgression', () => {
    it('should validate version progression', () => {
      const current = parseSemanticVersion('1.2.3')
      
      // Valid progressions
      expect(validateVersionProgression(current, parseSemanticVersion('1.2.4')).isValid).toBe(true)
      expect(validateVersionProgression(current, parseSemanticVersion('1.3.0')).isValid).toBe(true)
      expect(validateVersionProgression(current, parseSemanticVersion('2.0.0')).isValid).toBe(true)
      
      // Invalid progressions
      expect(validateVersionProgression(current, parseSemanticVersion('1.2.2')).isValid).toBe(false)
      expect(validateVersionProgression(current, parseSemanticVersion('1.1.0')).isValid).toBe(false)
      expect(validateVersionProgression(current, parseSemanticVersion('0.9.0')).isValid).toBe(false)
    })
  })
  
  describe('generateSchemaFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const schema1 = 'CREATE TABLE test (id INTEGER PRIMARY KEY);'
      const schema2 = 'CREATE TABLE test (id INTEGER PRIMARY KEY);'
      const schema3 = 'CREATE TABLE test (id TEXT PRIMARY KEY);'
      
      expect(generateSchemaFingerprint(schema1)).toBe(generateSchemaFingerprint(schema2))
      expect(generateSchemaFingerprint(schema1)).not.toBe(generateSchemaFingerprint(schema3))
    })
    
    it('should normalize schema for consistent fingerprinting', () => {
      const schema1 = `
        -- Comment
        CREATE TABLE test (
          id INTEGER PRIMARY KEY
        );
      `
      const schema2 = 'create table test (id integer primary key)'
      
      // Should generate same fingerprint despite formatting differences
      expect(generateSchemaFingerprint(schema1)).toBe(generateSchemaFingerprint(schema2))
    })
  })
  
  describe('SchemaVersioning utility object', () => {
    it('should provide all utility functions', () => {
      expect(typeof SchemaVersioning.parse).toBe('function')
      expect(typeof SchemaVersioning.format).toBe('function')
      expect(typeof SchemaVersioning.compare).toBe('function')
      expect(typeof SchemaVersioning.isGreater).toBe('function')
      expect(typeof SchemaVersioning.isLess).toBe('function')
      expect(typeof SchemaVersioning.isEqual).toBe('function')
      expect(typeof SchemaVersioning.isCompatible).toBe('function')
      expect(typeof SchemaVersioning.getNext).toBe('function')
      expect(typeof SchemaVersioning.parseRange).toBe('function')
      expect(typeof SchemaVersioning.satisfies).toBe('function')
      expect(typeof SchemaVersioning.analyzeChanges).toBe('function')
      expect(typeof SchemaVersioning.determineVersionBump).toBe('function')
      expect(typeof SchemaVersioning.validate).toBe('function')
      expect(typeof SchemaVersioning.validateProgression).toBe('function')
      expect(typeof SchemaVersioning.generateFingerprint).toBe('function')
    })
    
    it('should work with utility object methods', () => {
      const version = SchemaVersioning.parse('1.2.3')
      expect(SchemaVersioning.format(version)).toBe('1.2.3')
      
      const next = SchemaVersioning.getNext(version, 'minor')
      expect(SchemaVersioning.format(next)).toBe('1.3.0')
      
      expect(SchemaVersioning.isGreater(next, version)).toBe(true)
    })
  })
  
  describe('edge cases and error handling', () => {
    it('should handle edge cases in version comparison', () => {
      const cases = [
        { a: '1.0.0-alpha', b: '1.0.0-alpha.1', expected: 1 }, // alpha > alpha.1 lexically
        { a: '1.0.0-alpha.1', b: '1.0.0-alpha.beta', expected: -1 }, // numeric < string
        { a: '1.0.0-1', b: '1.0.0-2', expected: -1 }, // numeric comparison
      ]
      
      for (const testCase of cases) {
        const a = parseSemanticVersion(testCase.a)
        const b = parseSemanticVersion(testCase.b)
        const result = compareSemanticVersions(a, b)
        expect(result).toBe(testCase.expected)
      }
    })
    
    it('should handle caret ranges for 0.x versions', () => {
      const testCases = [
        { version: '0.0.1', range: '^0.0.1', expected: true },
        { version: '0.0.2', range: '^0.0.1', expected: false },
        { version: '0.1.1', range: '^0.1.0', expected: true },
        { version: '0.2.0', range: '^0.1.0', expected: false }
      ]
      
      for (const testCase of testCases) {
        const version = parseSemanticVersion(testCase.version)
        const range = parseVersionRange(testCase.range)
        const result = satisfiesRange(version, range)
        expect(result).toBe(testCase.expected)
      }
    })
  })
})