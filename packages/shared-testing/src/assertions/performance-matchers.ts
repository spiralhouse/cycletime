/**
 * Performance Matchers - Custom Jest matchers for performance testing
 * 
 * This module provides specialized matchers for validating performance
 * metrics in contract testing scenarios.
 */

import { PerformanceMetrics, PerformanceThresholds } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResponseTimeWithin(maxResponseTime: number): R;
      toHaveThroughputAbove(minThroughput: number): R;
      toHaveErrorRateBelow(maxErrorRate: number): R;
      toMeetPerformanceThresholds(thresholds: PerformanceThresholds): R;
      toHaveImprovedPerformance(baseline: PerformanceMetrics): R;
      toBePerformant(): R;
    }
  }
}

export interface PerformanceMatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Performance matchers utility class
 */
export class PerformanceMatchers {
  private static readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    responseTime: { max: 1000, unit: 'ms' },
    throughput: { min: 10, unit: 'requests/second' },
    concurrency: { max: 100, unit: 'concurrent_requests' }
  };

  /**
   * Extend Jest expect with performance-specific matchers
   */
  static extendExpect(): void {
    if (typeof expect === 'undefined') {
      console.warn('Jest expect not available - performance matchers not installed');
      return;
    }

    expect.extend({
      toHaveResponseTimeWithin,
      toHaveThroughputAbove,
      toHaveErrorRateBelow,
      toMeetPerformanceThresholds,
      toHaveImprovedPerformance,
      toBePerformant
    });
  }

  /**
   * Calculate performance percentiles from multiple metrics
   */
  static calculatePercentiles(
    metrics: PerformanceMetrics[],
    percentiles: number[] = [50, 90, 95, 99]
  ): Record<number, PerformanceMetrics> {
    if (metrics.length === 0) {
      throw new Error('Cannot calculate percentiles from empty metrics array');
    }

    const sortedByResponseTime = [...metrics].sort((a, b) => a.responseTime - b.responseTime);
    const result: Record<number, PerformanceMetrics> = {};

    for (const percentile of percentiles) {
      const index = Math.ceil((percentile / 100) * sortedByResponseTime.length) - 1;
      const metric = sortedByResponseTime[Math.max(0, index)];
      if (metric) {
        result[percentile] = metric;
      }
    }

    return result;
  }

  /**
   * Aggregate multiple performance metrics
   */
  static aggregateMetrics(metrics: PerformanceMetrics[]): {
    average: PerformanceMetrics;
    min: PerformanceMetrics;
    max: PerformanceMetrics;
    total: number;
  } {
    if (metrics.length === 0) {
      throw new Error('Cannot aggregate empty metrics array');
    }

    const responseTimeSorted = [...metrics].sort((a, b) => a.responseTime - b.responseTime);
    const throughputSorted = [...metrics].sort((a, b) => a.throughput - b.throughput);
    const errorRateSorted = [...metrics].sort((a, b) => a.errorRate - b.errorRate);

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    const avgConcurrency = metrics.reduce((sum, m) => sum + m.concurrency, 0) / metrics.length;

    return {
      average: {
        responseTime: avgResponseTime,
        throughput: avgThroughput,
        errorRate: avgErrorRate,
        concurrency: avgConcurrency,
        timestamp: Date.now()
      },
      min: {
        responseTime: responseTimeSorted[0]?.responseTime ?? 0,
        throughput: throughputSorted[0]?.throughput ?? 0,
        errorRate: errorRateSorted[0]?.errorRate ?? 0,
        concurrency: Math.min(...metrics.map(m => m.concurrency)),
        timestamp: Math.min(...metrics.map(m => m.timestamp))
      },
      max: {
        responseTime: responseTimeSorted[responseTimeSorted.length - 1]?.responseTime ?? 0,
        throughput: throughputSorted[throughputSorted.length - 1]?.throughput ?? 0,
        errorRate: errorRateSorted[errorRateSorted.length - 1]?.errorRate ?? 0,
        concurrency: Math.max(...metrics.map(m => m.concurrency)),
        timestamp: Math.max(...metrics.map(m => m.timestamp))
      },
      total: metrics.length
    };
  }
}

/**
 * Matcher for response time validation
 */
function toHaveResponseTimeWithin(
  received: PerformanceMetrics,
  maxResponseTime: number
): PerformanceMatcherResult {
  const pass = received.responseTime <= maxResponseTime;

  return {
    pass,
    message: () => pass
      ? `Response time ${received.responseTime}ms is within limit of ${maxResponseTime}ms`
      : `Response time ${received.responseTime}ms exceeds limit of ${maxResponseTime}ms`
  };
}

/**
 * Matcher for throughput validation
 */
function toHaveThroughputAbove(
  received: PerformanceMetrics,
  minThroughput: number
): PerformanceMatcherResult {
  const pass = received.throughput >= minThroughput;

  return {
    pass,
    message: () => pass
      ? `Throughput ${received.throughput} requests/sec meets minimum of ${minThroughput} requests/sec`
      : `Throughput ${received.throughput} requests/sec is below minimum of ${minThroughput} requests/sec`
  };
}

/**
 * Matcher for error rate validation
 */
function toHaveErrorRateBelow(
  received: PerformanceMetrics,
  maxErrorRate: number
): PerformanceMatcherResult {
  const pass = received.errorRate <= maxErrorRate;

  return {
    pass,
    message: () => pass
      ? `Error rate ${(received.errorRate * 100).toFixed(2)}% is within limit of ${(maxErrorRate * 100).toFixed(2)}%`
      : `Error rate ${(received.errorRate * 100).toFixed(2)}% exceeds limit of ${(maxErrorRate * 100).toFixed(2)}%`
  };
}

/**
 * Matcher for comprehensive performance thresholds
 */
function toMeetPerformanceThresholds(
  received: PerformanceMetrics,
  thresholds: PerformanceThresholds
): PerformanceMatcherResult {
  const failures: string[] = [];

  // Check response time
  if (received.responseTime > thresholds.responseTime.max) {
    failures.push(`Response time ${received.responseTime}ms exceeds ${thresholds.responseTime.max}${thresholds.responseTime.unit}`);
  }

  // Check throughput
  if (received.throughput < thresholds.throughput.min) {
    failures.push(`Throughput ${received.throughput} is below ${thresholds.throughput.min} ${thresholds.throughput.unit}`);
  }

  // Check concurrency
  if (received.concurrency > thresholds.concurrency.max) {
    failures.push(`Concurrency ${received.concurrency} exceeds ${thresholds.concurrency.max} ${thresholds.concurrency.unit}`);
  }

  const pass = failures.length === 0;

  return {
    pass,
    message: () => pass
      ? `All performance thresholds met`
      : `Performance thresholds not met:\n${failures.map(f => `  - ${f}`).join('\n')}`
  };
}

/**
 * Matcher for performance improvement comparison
 */
function toHaveImprovedPerformance(
  received: PerformanceMetrics,
  baseline: PerformanceMetrics
): PerformanceMatcherResult {
  const improvements: string[] = [];
  const regressions: string[] = [];

  // Check response time improvement (lower is better)
  const responseTimeChange = ((baseline.responseTime - received.responseTime) / baseline.responseTime) * 100;
  if (responseTimeChange > 0) {
    improvements.push(`Response time improved by ${responseTimeChange.toFixed(1)}%`);
  } else if (responseTimeChange < -5) { // Allow 5% tolerance
    regressions.push(`Response time regressed by ${Math.abs(responseTimeChange).toFixed(1)}%`);
  }

  // Check throughput improvement (higher is better)
  const throughputChange = ((received.throughput - baseline.throughput) / baseline.throughput) * 100;
  if (throughputChange > 0) {
    improvements.push(`Throughput improved by ${throughputChange.toFixed(1)}%`);
  } else if (throughputChange < -5) { // Allow 5% tolerance
    regressions.push(`Throughput regressed by ${Math.abs(throughputChange).toFixed(1)}%`);
  }

  // Check error rate improvement (lower is better)
  const errorRateChange = ((baseline.errorRate - received.errorRate) / (baseline.errorRate || 0.01)) * 100;
  if (errorRateChange > 0) {
    improvements.push(`Error rate improved by ${errorRateChange.toFixed(1)}%`);
  } else if (errorRateChange < -10) { // Allow 10% tolerance for error rates
    regressions.push(`Error rate regressed by ${Math.abs(errorRateChange).toFixed(1)}%`);
  }

  const pass = regressions.length === 0;

  return {
    pass,
    message: () => {
      const improvementText = improvements.length > 0 
        ? `\nImprovements:\n${improvements.map(i => `  + ${i}`).join('\n')}`
        : '';
      
      const regressionText = regressions.length > 0
        ? `\nRegressions:\n${regressions.map(r => `  - ${r}`).join('\n')}`
        : '';

      if (pass) {
        return `Performance maintained or improved compared to baseline${improvementText}`;
      } else {
        return `Performance regressed compared to baseline${regressionText}${improvementText}`;
      }
    }
  };
}

/**
 * Matcher for general performance validation using default thresholds
 */
function toBePerformant(
  received: PerformanceMetrics
): PerformanceMatcherResult {
  return toMeetPerformanceThresholds(received, PerformanceMatchers['DEFAULT_THRESHOLDS']);
}