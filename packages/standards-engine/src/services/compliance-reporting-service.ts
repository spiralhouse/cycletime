import {
  IComplianceReportingService,
  ComplianceReport,
  ComplianceMetrics,
  ComplianceTrends,
  ComplianceSummary
} from '../types/standards-types.js';
import { MockDataService } from './mock-data-service.js';

/**
 * Compliance Reporting Service
 * Handles compliance report generation, metrics calculation, and trend analysis
 */
export class ComplianceReportingService implements IComplianceReportingService {
  private mockDataService: MockDataService;
  private reportsCache: Map<string, ComplianceReport> = new Map();
  private metricsCache: Map<string, ComplianceMetrics> = new Map();

  constructor() {
    this.mockDataService = new MockDataService();
  }

  /**
   * Get compliance report for a specific commit
   */
  async getComplianceReport(commitId: string, includeSuggestions: boolean = true): Promise<ComplianceReport> {
    // Simulate report generation delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(300, 800));

    // Check cache first
    const cacheKey = `${commitId}-${includeSuggestions}`;
    let report = this.reportsCache.get(cacheKey);

    if (!report) {
      // Generate new report
      const projectId = this.getProjectIdFromCommit(commitId);
      report = this.mockDataService.generateComplianceReport(commitId, projectId);

      // Add suggestions if requested
      if (includeSuggestions) {
        report = await this.enrichReportWithSuggestions(report);
      }

      // Cache the report
      this.reportsCache.set(cacheKey, report);
    }

    return report;
  }

  /**
   * Get compliance metrics for a project over a specified timeframe
   */
  async getComplianceMetrics(
    projectId: string,
    timeframe: string = 'month',
    granularity: string = 'daily'
  ): Promise<ComplianceMetrics> {
    // Simulate metrics calculation delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(400, 1000));

    const cacheKey = `${projectId}-${timeframe}-${granularity}`;
    let metrics = this.metricsCache.get(cacheKey);

    if (!metrics) {
      // Generate new metrics
      metrics = this.mockDataService.generateComplianceMetrics(projectId, timeframe);
      
      // Apply granularity-specific adjustments
      metrics = this.adjustMetricsForGranularity(metrics, granularity);

      // Cache the metrics
      this.metricsCache.set(cacheKey, metrics);
    }

    return metrics;
  }

  /**
   * Generate compliance trends for a project
   */
  async generateTrends(projectId: string, timeframe: string): Promise<ComplianceTrends> {
    // Simulate trend analysis delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(200, 600));

    const metrics = await this.getComplianceMetrics(projectId, timeframe);
    
    // Calculate trends based on score data
    const scoreTrend = metrics.metrics.scoreTrend;
    const currentScore = scoreTrend[scoreTrend.length - 1]?.score || 0;
    const previousScore = scoreTrend[Math.max(0, scoreTrend.length - 7)]?.score || currentScore;
    const scoreChange = currentScore - previousScore;

    // Determine trend direction
    let trendDirection: 'improving' | 'stable' | 'declining';
    if (scoreChange > 2) {
      trendDirection = 'improving';
    } else if (scoreChange < -2) {
      trendDirection = 'declining';
    } else {
      trendDirection = 'stable';
    }

    // Calculate violation trends
    const violationTrend = this.calculateViolationTrends(metrics);

    return {
      scoreTrend: trendDirection,
      previousScore,
      scoreChange,
      violationTrend
    };
  }

  /**
   * Get compliance summary for multiple projects
   */
  async getMultiProjectSummary(projectIds: string[], timeframe: string = 'month'): Promise<{
    overallScore: number;
    projectSummaries: Array<{
      projectId: string;
      score: number;
      trend: 'improving' | 'stable' | 'declining';
      violationCount: number;
    }>;
    topIssues: Array<{
      ruleId: string;
      count: number;
      affectedProjects: number;
    }>;
  }> {
    // Simulate multi-project analysis delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(500, 1200));

    const projectSummaries = [];
    let totalScore = 0;
    const allViolations: Record<string, { count: number; projects: Set<string> }> = {};

    for (const projectId of projectIds) {
      const metrics = await this.getComplianceMetrics(projectId, timeframe);
      const trends = await this.generateTrends(projectId, timeframe);

      projectSummaries.push({
        projectId,
        score: metrics.metrics.averageScore,
        trend: trends.scoreTrend,
        violationCount: metrics.metrics.topViolations.reduce((sum, v) => sum + v.count, 0)
      });

      totalScore += metrics.metrics.averageScore;

      // Aggregate violations across projects
      metrics.metrics.topViolations.forEach(violation => {
        if (!allViolations[violation.ruleId]) {
          allViolations[violation.ruleId] = { count: 0, projects: new Set() };
        }
        allViolations[violation.ruleId].count += violation.count;
        allViolations[violation.ruleId].projects.add(projectId);
      });
    }

    const overallScore = projectIds.length > 0 ? totalScore / projectIds.length : 0;

    // Sort violations by count and affected projects
    const topIssues = Object.entries(allViolations)
      .map(([ruleId, data]) => ({
        ruleId,
        count: data.count,
        affectedProjects: data.projects.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      overallScore: Math.round(overallScore),
      projectSummaries,
      topIssues
    };
  }

  /**
   * Generate historical compliance comparison
   */
  async getHistoricalComparison(
    projectId: string,
    currentPeriod: string,
    comparisonPeriod: string
  ): Promise<{
    current: ComplianceMetrics;
    comparison: ComplianceMetrics;
    improvements: string[];
    regressions: string[];
    recommendations: string[];
  }> {
    // Simulate historical analysis delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(600, 1200));

    const current = await this.getComplianceMetrics(projectId, currentPeriod);
    const comparison = await this.getComplianceMetrics(projectId, comparisonPeriod);

    const improvements: string[] = [];
    const regressions: string[] = [];
    const recommendations: string[] = [];

    // Compare scores
    const scoreDiff = current.metrics.averageScore - comparison.metrics.averageScore;
    if (scoreDiff > 5) {
      improvements.push(`Overall compliance score improved by ${scoreDiff.toFixed(1)} points`);
    } else if (scoreDiff < -5) {
      regressions.push(`Overall compliance score declined by ${Math.abs(scoreDiff).toFixed(1)} points`);
    }

    // Compare violation trends
    const currentViolations = current.metrics.topViolations.reduce((sum, v) => sum + v.count, 0);
    const comparisonViolations = comparison.metrics.topViolations.reduce((sum, v) => sum + v.count, 0);
    const violationDiff = currentViolations - comparisonViolations;

    if (violationDiff < -10) {
      improvements.push(`Reduced total violations by ${Math.abs(violationDiff)}`);
    } else if (violationDiff > 10) {
      regressions.push(`Increased total violations by ${violationDiff}`);
    }

    // Generate recommendations based on comparison
    if (regressions.length > improvements.length) {
      recommendations.push('Consider implementing stricter code review processes');
      recommendations.push('Review recent changes that may have introduced quality issues');
    }

    if (current.metrics.averageScore < 80) {
      recommendations.push('Focus on addressing error-level violations first');
      recommendations.push('Consider automated quality gates in CI/CD pipeline');
    }

    return {
      current,
      comparison,
      improvements,
      regressions,
      recommendations
    };
  }

  /**
   * Get compliance alerts for project
   */
  async getComplianceAlerts(projectId: string): Promise<Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    createdAt: string;
  }>> {
    // Simulate alert generation delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(200, 500));

    const metrics = await this.getComplianceMetrics(projectId, 'week');
    const alerts = [];

    // Critical alerts
    if (metrics.metrics.averageScore < 60) {
      alerts.push({
        type: 'critical' as const,
        title: 'Low Compliance Score',
        description: `Project compliance score is ${metrics.metrics.averageScore}%, below critical threshold`,
        recommendation: 'Immediate action required to address major violations',
        createdAt: new Date().toISOString()
      });
    }

    // Security-related alerts
    const securityViolations = metrics.metrics.topViolations.filter(v => 
      v.ruleId.includes('security') || v.ruleId.includes('vulnerability')
    );

    if (securityViolations.length > 0) {
      alerts.push({
        type: 'critical' as const,
        title: 'Security Violations Detected',
        description: `Found ${securityViolations.length} security-related violations`,
        recommendation: 'Review and fix security issues immediately',
        createdAt: new Date().toISOString()
      });
    }

    // Warning alerts
    if (metrics.metrics.averageScore < 80 && metrics.metrics.averageScore >= 60) {
      alerts.push({
        type: 'warning' as const,
        title: 'Compliance Score Below Target',
        description: `Project compliance score is ${metrics.metrics.averageScore}%, below target of 80%`,
        recommendation: 'Schedule time to address outstanding violations',
        createdAt: new Date().toISOString()
      });
    }

    // Trend-based alerts
    const trends = await this.generateTrends(projectId, 'month');
    if (trends.scoreTrend === 'declining' && trends.scoreChange && trends.scoreChange < -10) {
      alerts.push({
        type: 'warning' as const,
        title: 'Declining Compliance Trend',
        description: `Compliance score has declined by ${Math.abs(trends.scoreChange).toFixed(1)} points`,
        recommendation: 'Review recent changes and development practices',
        createdAt: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Export compliance data in various formats
   */
  async exportComplianceData(
    projectId: string,
    format: 'csv' | 'json' | 'xlsx',
    timeframe: string = 'month'
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // Simulate export preparation delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(400, 800));

    const metrics = await this.getComplianceMetrics(projectId, timeframe);
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(metrics, null, 2),
          filename: `compliance-report-${projectId}-${timestamp}.json`,
          contentType: 'application/json'
        };

      case 'csv':
        const csvData = this.convertMetricsToCSV(metrics);
        return {
          data: csvData,
          filename: `compliance-report-${projectId}-${timestamp}.csv`,
          contentType: 'text/csv'
        };

      case 'xlsx':
        // In a real implementation, this would generate an actual Excel file
        return {
          data: 'Excel export would be generated here',
          filename: `compliance-report-${projectId}-${timestamp}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Helper: Get project ID from commit ID (mock implementation)
   */
  private getProjectIdFromCommit(commitId: string): string {
    // In a real implementation, this would look up the project from the commit
    const projects = ['proj-frontend-app', 'proj-backend-api', 'proj-mobile-client'];
    return projects[commitId.length % projects.length];
  }

  /**
   * Helper: Enrich report with suggestions
   */
  private async enrichReportWithSuggestions(report: ComplianceReport): Promise<ComplianceReport> {
    // Add file-level suggestions based on violations
    report.fileReports.forEach(fileReport => {
      fileReport.violations.forEach(violation => {
        if (!violation.suggestion && violation.ruleId) {
          violation.suggestion = this.generateSuggestionForRule(violation.ruleId);
        }
      });
    });

    return report;
  }

  /**
   * Helper: Generate suggestion for a specific rule
   */
  private generateSuggestionForRule(ruleId: string): string {
    const suggestions: Record<string, string> = {
      'ts-no-var': 'Replace var with const or let',
      'ts-prefer-const': 'Use const for variables that are never reassigned',
      'py-pep8-line-length': 'Break long lines into multiple lines',
      'security-hardcoded-secrets': 'Move secrets to environment variables',
      'default': 'Review this code against the coding standards'
    };

    return suggestions[ruleId] || suggestions.default;
  }

  /**
   * Helper: Adjust metrics based on granularity
   */
  private adjustMetricsForGranularity(metrics: ComplianceMetrics, granularity: string): ComplianceMetrics {
    // In a real implementation, this would adjust data points based on granularity
    // For now, we'll return the metrics as-is
    return metrics;
  }

  /**
   * Helper: Calculate violation trends
   */
  private calculateViolationTrends(metrics: ComplianceMetrics): {
    totalChange: number;
    bySeverity: { error: number; warning: number; info: number };
  } {
    // Mock calculation - in real implementation, this would compare with historical data
    return {
      totalChange: Math.floor(Math.random() * 20) - 10, // Random change between -10 and +10
      bySeverity: {
        error: Math.floor(Math.random() * 6) - 3,
        warning: Math.floor(Math.random() * 10) - 5,
        info: Math.floor(Math.random() * 8) - 4
      }
    };
  }

  /**
   * Helper: Convert metrics to CSV format
   */
  private convertMetricsToCSV(metrics: ComplianceMetrics): string {
    const headers = ['Date', 'Score'];
    const rows = metrics.metrics.scoreTrend.map(point => 
      `${point.date},${point.score}`
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.reportsCache.clear();
    this.metricsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    reportsSize: number; 
    metricsSize: number; 
    totalMemoryUsage: string;
  } {
    return {
      reportsSize: this.reportsCache.size,
      metricsSize: this.metricsCache.size,
      totalMemoryUsage: `~${(this.reportsCache.size + this.metricsCache.size) * 50}KB` // Rough estimate
    };
  }
}