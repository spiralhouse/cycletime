/**
 * Performance Testing Helpers
 * 
 * Utilities for measuring, analyzing, and reporting performance metrics
 * across the JCVD infrastructure testing suite.
 */

import { performance } from 'node:perf_hooks'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// =============================================================================
// Performance Measurement Types
// =============================================================================

export interface PerformanceMetric {
  name: string
  duration: number
  startTime: number
  endTime: number
  metadata?: Record<string, any>
}

export interface PerformanceBenchmark {
  testSuite: string
  testName: string
  metrics: PerformanceMetric[]
  summary: {
    totalDuration: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    operationCount: number
  }
  timestamp: Date
}

export interface PerformanceReport {
  reportId: string
  timestamp: Date
  environment: {
    nodeVersion: string
    platform: string
    arch: string
    memory: NodeJS.MemoryUsage
  }
  benchmarks: PerformanceBenchmark[]
  summary: {
    totalTests: number
    totalDuration: number
    averageTestDuration: number
    slowestTest: { name: string; duration: number }
    fastestTest: { name: string; duration: number }
  }
  thresholds: {
    queryPerformance: number // ms
    migrationPerformance: number // ms
    memoryUsage: number // MB
  }
  violations: Array<{
    type: 'performance' | 'memory'
    description: string
    actual: number
    expected: number
  }>
}

// =============================================================================
// Performance Measurement Utilities
// =============================================================================

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private benchmarks: PerformanceBenchmark[] = []
  private currentSuite: string = ''
  private currentTest: string = ''

  setSuite(suiteName: string) {
    this.currentSuite = suiteName
  }

  setTest(testName: string) {
    this.currentTest = testName
  }

  startMeasurement(name: string, metadata?: Record<string, any>): string {
    const measurementId = `${this.currentSuite}:${this.currentTest}:${name}`
    const startTime = performance.now()
    
    this.metrics.set(measurementId, {
      name,
      duration: 0,
      startTime,
      endTime: 0,
      metadata
    })
    
    return measurementId
  }

  endMeasurement(measurementId: string): PerformanceMetric {
    const metric = this.metrics.get(measurementId)
    if (!metric) {
      throw new Error(`No measurement found for ID: ${measurementId}`)
    }
    
    const endTime = performance.now()
    metric.endTime = endTime
    metric.duration = endTime - metric.startTime
    
    return metric
  }

  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const measurementId = this.startMeasurement(name, metadata)
    
    try {
      const result = await operation()
      const metric = this.endMeasurement(measurementId)
      return { result, metric }
    } catch (error) {
      // End measurement even on error
      this.endMeasurement(measurementId)
      throw error
    }
  }

  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): { result: T; metric: PerformanceMetric } {
    const measurementId = this.startMeasurement(name, metadata)
    
    try {
      const result = operation()
      const metric = this.endMeasurement(measurementId)
      return { result, metric }
    } catch (error) {
      // End measurement even on error
      this.endMeasurement(measurementId)
      throw error
    }
  }

  recordMetric(name: string, duration: number, metadata?: Record<string, any>): PerformanceMetric {
    const metric: PerformanceMetric = {
      name,
      duration,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      metadata
    }
    
    const measurementId = `${this.currentSuite}:${this.currentTest}:${name}`
    this.metrics.set(measurementId, metric)
    
    return metric
  }

  finalizeBenchmark(): PerformanceBenchmark {
    const testMetrics = Array.from(this.metrics.values()).filter(
      m => m.name.startsWith(`${this.currentSuite}:${this.currentTest}:`)
    )
    
    const durations = testMetrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    
    const benchmark: PerformanceBenchmark = {
      testSuite: this.currentSuite,
      testName: this.currentTest,
      metrics: testMetrics,
      summary: {
        totalDuration,
        averageDuration: durations.length > 0 ? totalDuration / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        operationCount: durations.length
      },
      timestamp: new Date()
    }
    
    this.benchmarks.push(benchmark)
    return benchmark
  }

  getAllBenchmarks(): PerformanceBenchmark[] {
    return [...this.benchmarks]
  }

  clearMetrics() {
    this.metrics.clear()
  }

  clearBenchmarks() {
    this.benchmarks = []
  }
}

// =============================================================================
// Database Performance Analyzers
// =============================================================================

export interface DatabasePerformanceMetrics {
  queryCount: number
  totalQueryTime: number
  averageQueryTime: number
  slowestQuery: { sql: string; duration: number }
  fastestQuery: { sql: string; duration: number }
  memoryUsage: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    delta: NodeJS.MemoryUsage
  }
}

export class DatabasePerformanceAnalyzer {
  private queryMetrics: Array<{ sql: string; duration: number }> = []
  private memoryBefore: NodeJS.MemoryUsage | null = null
  private memoryAfter: NodeJS.MemoryUsage | null = null

  startAnalysis() {
    this.memoryBefore = process.memoryUsage()
    this.queryMetrics = []
  }

  recordQuery(sql: string, duration: number) {
    this.queryMetrics.push({ sql, duration })
  }

  endAnalysis(): DatabasePerformanceMetrics {
    this.memoryAfter = process.memoryUsage()
    
    if (this.queryMetrics.length === 0) {
      throw new Error('No query metrics recorded')
    }
    
    const durations = this.queryMetrics.map(q => q.duration)
    const totalTime = durations.reduce((sum, d) => sum + d, 0)
    
    const slowest = this.queryMetrics.reduce((prev, curr) => 
      curr.duration > prev.duration ? curr : prev
    )
    
    const fastest = this.queryMetrics.reduce((prev, curr) => 
      curr.duration < prev.duration ? curr : prev
    )
    
    const memoryDelta: NodeJS.MemoryUsage = {
      rss: (this.memoryAfter?.rss || 0) - (this.memoryBefore?.rss || 0),
      heapTotal: (this.memoryAfter?.heapTotal || 0) - (this.memoryBefore?.heapTotal || 0),
      heapUsed: (this.memoryAfter?.heapUsed || 0) - (this.memoryBefore?.heapUsed || 0),
      external: (this.memoryAfter?.external || 0) - (this.memoryBefore?.external || 0),
      arrayBuffers: (this.memoryAfter?.arrayBuffers || 0) - (this.memoryBefore?.arrayBuffers || 0)
    }
    
    return {
      queryCount: this.queryMetrics.length,
      totalQueryTime: totalTime,
      averageQueryTime: totalTime / this.queryMetrics.length,
      slowestQuery: slowest,
      fastestQuery: fastest,
      memoryUsage: {
        before: this.memoryBefore!,
        after: this.memoryAfter!,
        delta: memoryDelta
      }
    }
  }
}

// =============================================================================
// Load Testing Utilities
// =============================================================================

export interface LoadTestConfig {
  concurrentUsers: number
  operationsPerUser: number
  rampUpTime: number // ms
  testDuration: number // ms
  operationType: 'read' | 'write' | 'mixed'
}

export interface LoadTestResult {
  config: LoadTestConfig
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  operationsPerSecond: number
  errorRate: number
  errors: Array<{ operation: string; error: string; timestamp: number }>
}

export class LoadTester {
  async runLoadTest<T>(
    config: LoadTestConfig,
    operationFactory: () => Promise<T>
  ): Promise<LoadTestResult> {
    const results: Array<{ success: boolean; duration: number; error?: string }> = []
    const errors: Array<{ operation: string; error: string; timestamp: number }> = []
    const startTime = performance.now()
    
    // Create concurrent user simulations
    const userPromises: Promise<void>[] = []
    
    for (let user = 0; user < config.concurrentUsers; user++) {
      const userPromise = this.simulateUser(
        user,
        config,
        operationFactory,
        results,
        errors
      )
      userPromises.push(userPromise)
      
      // Ramp up delay
      if (config.rampUpTime > 0) {
        await this.wait(config.rampUpTime / config.concurrentUsers)
      }
    }
    
    // Wait for all users to complete
    await Promise.all(userPromises)
    
    const endTime = performance.now()
    const totalDuration = endTime - startTime
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const durations = successful.map(r => r.duration)
    
    return {
      config,
      totalOperations: results.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageResponseTime: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      minResponseTime: durations.length > 0 ? Math.min(...durations) : 0,
      maxResponseTime: durations.length > 0 ? Math.max(...durations) : 0,
      operationsPerSecond: results.length / (totalDuration / 1000),
      errorRate: failed.length / results.length,
      errors: errors.slice(0, 100) // Limit error reporting
    }
  }

  private async simulateUser<T>(
    userId: number,
    config: LoadTestConfig,
    operationFactory: () => Promise<T>,
    results: Array<{ success: boolean; duration: number; error?: string }>,
    errors: Array<{ operation: string; error: string; timestamp: number }>
  ): Promise<void> {
    const userStartTime = performance.now()
    let operationCount = 0
    
    while (
      operationCount < config.operationsPerUser &&
      (performance.now() - userStartTime) < config.testDuration
    ) {
      const operationStart = performance.now()
      
      try {
        await operationFactory()
        const duration = performance.now() - operationStart
        results.push({ success: true, duration })
      } catch (error) {
        const duration = performance.now() - operationStart
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        results.push({ success: false, duration, error: errorMessage })
        errors.push({
          operation: `user-${userId}-op-${operationCount}`,
          error: errorMessage,
          timestamp: Date.now()
        })
      }
      
      operationCount++
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Report Generation
// =============================================================================

export class PerformanceReporter {
  private tracker: PerformanceTracker
  private reportDir: string

  constructor(tracker: PerformanceTracker, reportDir: string = './tests/reports') {
    this.tracker = tracker
    this.reportDir = reportDir
  }

  async generateReport(): Promise<PerformanceReport> {
    const benchmarks = this.tracker.getAllBenchmarks()
    const reportId = `perf-report-${Date.now()}`
    
    // Calculate summary statistics
    const totalTests = benchmarks.length
    const totalDuration = benchmarks.reduce((sum, b) => sum + b.summary.totalDuration, 0)
    const averageTestDuration = totalDuration / totalTests
    
    let slowestTest = { name: '', duration: 0 }
    let fastestTest = { name: '', duration: Infinity }
    
    for (const benchmark of benchmarks) {
      const testName = `${benchmark.testSuite}:${benchmark.testName}`
      if (benchmark.summary.totalDuration > slowestTest.duration) {
        slowestTest = { name: testName, duration: benchmark.summary.totalDuration }
      }
      if (benchmark.summary.totalDuration < fastestTest.duration) {
        fastestTest = { name: testName, duration: benchmark.summary.totalDuration }
      }
    }
    
    // Define performance thresholds
    const thresholds = {
      queryPerformance: 100, // 100ms max for queries
      migrationPerformance: 5000, // 5 seconds max for migrations
      memoryUsage: 500 // 500MB max memory usage
    }
    
    // Check for threshold violations
    const violations: PerformanceReport['violations'] = []
    
    for (const benchmark of benchmarks) {
      for (const metric of benchmark.metrics) {
        if (metric.name.includes('query') && metric.duration > thresholds.queryPerformance) {
          violations.push({
            type: 'performance',
            description: `Query performance violation in ${benchmark.testSuite}:${benchmark.testName}`,
            actual: metric.duration,
            expected: thresholds.queryPerformance
          })
        }
        
        if (metric.name.includes('migration') && metric.duration > thresholds.migrationPerformance) {
          violations.push({
            type: 'performance',
            description: `Migration performance violation in ${benchmark.testSuite}:${benchmark.testName}`,
            actual: metric.duration,
            expected: thresholds.migrationPerformance
          })
        }
      }
    }
    
    const report: PerformanceReport = {
      reportId,
      timestamp: new Date(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      benchmarks,
      summary: {
        totalTests,
        totalDuration,
        averageTestDuration,
        slowestTest,
        fastestTest
      },
      thresholds,
      violations
    }
    
    // Save report to file
    await this.saveReport(report)
    
    return report
  }

  private async saveReport(report: PerformanceReport): Promise<void> {
    try {
      await mkdir(this.reportDir, { recursive: true })
      
      const reportPath = join(this.reportDir, `${report.reportId}.json`)
      await writeFile(reportPath, JSON.stringify(report, null, 2))
      
      // Also generate a human-readable summary
      const summaryPath = join(this.reportDir, `${report.reportId}-summary.md`)
      const summaryContent = this.generateMarkdownSummary(report)
      await writeFile(summaryPath, summaryContent)
      
      console.log(`Performance report saved to: ${reportPath}`)
      console.log(`Performance summary saved to: ${summaryPath}`)
      
    } catch (error) {
      console.error('Failed to save performance report:', error)
    }
  }

  private generateMarkdownSummary(report: PerformanceReport): string {
    const { summary, environment, benchmarks, violations } = report
    
    let markdown = `# Performance Test Report

**Report ID:** ${report.reportId}  
**Generated:** ${report.timestamp.toISOString()}

## Environment

- **Node.js Version:** ${environment.nodeVersion}
- **Platform:** ${environment.platform} (${environment.arch})
- **Memory Usage:** ${(environment.memory.heapUsed / 1024 / 1024).toFixed(2)} MB

## Summary

- **Total Tests:** ${summary.totalTests}
- **Total Duration:** ${summary.totalDuration.toFixed(2)}ms
- **Average Test Duration:** ${summary.averageTestDuration.toFixed(2)}ms
- **Slowest Test:** ${summary.slowestTest.name} (${summary.slowestTest.duration.toFixed(2)}ms)
- **Fastest Test:** ${summary.fastestTest.name} (${summary.fastestTest.duration.toFixed(2)}ms)

## Performance Thresholds

- **Query Performance:** < ${report.thresholds.queryPerformance}ms
- **Migration Performance:** < ${report.thresholds.migrationPerformance}ms
- **Memory Usage:** < ${report.thresholds.memoryUsage}MB

`

    if (violations.length > 0) {
      markdown += `## ⚠️ Performance Violations

${violations.map(v => 
  `- **${v.type.toUpperCase()}:** ${v.description} (${v.actual} vs ${v.expected} expected)`
).join('\n')}

`
    } else {
      markdown += `## ✅ All Performance Thresholds Met

No performance violations detected.

`
    }

    markdown += `## Detailed Benchmarks

`

    for (const benchmark of benchmarks) {
      markdown += `### ${benchmark.testSuite} - ${benchmark.testName}

- **Total Duration:** ${benchmark.summary.totalDuration.toFixed(2)}ms
- **Operations:** ${benchmark.summary.operationCount}
- **Average Operation:** ${benchmark.summary.averageDuration.toFixed(2)}ms
- **Min/Max:** ${benchmark.summary.minDuration.toFixed(2)}ms / ${benchmark.summary.maxDuration.toFixed(2)}ms

`
    }

    return markdown
  }

  logPerformanceSummary(report: PerformanceReport): void {
    console.log('\n=== Performance Test Summary ===')
    console.log(`Total Tests: ${report.summary.totalTests}`)
    console.log(`Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`)
    console.log(`Average Test Duration: ${report.summary.averageTestDuration.toFixed(2)}ms`)
    console.log(`Slowest Test: ${report.summary.slowestTest.name} (${report.summary.slowestTest.duration.toFixed(2)}ms)`)
    console.log(`Fastest Test: ${report.summary.fastestTest.name} (${report.summary.fastestTest.duration.toFixed(2)}ms)`)
    
    if (report.violations.length > 0) {
      console.log(`\n⚠️  Performance Violations: ${report.violations.length}`)
      for (const violation of report.violations) {
        console.log(`   - ${violation.description} (${violation.actual} vs ${violation.expected})`)
      }
    } else {
      console.log('\n✅ All performance thresholds met')
    }
    
    console.log(`\nReport saved as: ${report.reportId}`)
  }
}

// =============================================================================
// Global Performance Tracking
// =============================================================================

export const globalPerformanceTracker = new PerformanceTracker()
export const globalReporter = new PerformanceReporter(globalPerformanceTracker)