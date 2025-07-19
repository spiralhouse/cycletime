import { ValidationEngine } from '../utils/validation-engine';
import { 
  ValidationResult, 
  ValidationOptions, 
  ValidationRule 
} from '../types/validation-types';
import { logger } from '@cycletime/shared-utils';

export class ValidationService {
  private validationEngine: ValidationEngine;

  constructor() {
    this.validationEngine = new ValidationEngine();
  }

  async validateContract(contract: any, options: ValidationOptions = {}): Promise<ValidationResult> {
    try {
      logger.debug('Validating contract', { 
        contractTitle: contract.info?.title, 
        options 
      });

      const result = await this.validationEngine.validateContract(contract, options);
      
      logger.info('Contract validation completed', {
        contractTitle: contract.info?.title,
        valid: result.valid,
        score: result.score,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('Contract validation failed', { error, contract: contract.info?.title });
      throw error;
    }
  }

  async validateAsyncAPI(asyncApiSpec: any, options: ValidationOptions = {}): Promise<ValidationResult> {
    try {
      logger.debug('Validating AsyncAPI specification', { 
        title: asyncApiSpec.info?.title, 
        options 
      });

      const result = await this.validationEngine.validateAsyncAPI(asyncApiSpec, options);
      
      logger.info('AsyncAPI validation completed', {
        title: asyncApiSpec.info?.title,
        valid: result.valid,
        score: result.score,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('AsyncAPI validation failed', { error, title: asyncApiSpec.info?.title });
      throw error;
    }
  }

  async validateContractWithCustomRules(
    contract: any, 
    customRules: ValidationRule[], 
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    try {
      // Temporarily add custom rules
      const originalRules = this.validationEngine.getRules();
      
      customRules.forEach(rule => {
        this.validationEngine.addRule(rule);
      });

      const result = await this.validationEngine.validateContract(contract, options);

      // Restore original rules
      customRules.forEach(rule => {
        this.validationEngine.removeRule(rule.id);
      });

      return result;
    } catch (error) {
      logger.error('Custom rule validation failed', { error, customRules: customRules.map(r => r.id) });
      throw error;
    }
  }

  async validateMultipleContracts(contracts: any[], options: ValidationOptions = {}): Promise<ValidationResult[]> {
    try {
      logger.info('Validating multiple contracts', { count: contracts.length });

      const results = await Promise.all(
        contracts.map(contract => this.validateContract(contract, options))
      );

      const summary = {
        total: results.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      };

      logger.info('Multiple contract validation completed', summary);

      return results;
    } catch (error) {
      logger.error('Multiple contract validation failed', { error, count: contracts.length });
      throw error;
    }
  }

  async getValidationRules(): Promise<ValidationRule[]> {
    return this.validationEngine.getRules();
  }

  async addValidationRule(rule: ValidationRule): Promise<void> {
    try {
      this.validationEngine.addRule(rule);
      logger.info('Validation rule added', { ruleId: rule.id, ruleName: rule.name });
    } catch (error) {
      logger.error('Failed to add validation rule', { error, ruleId: rule.id });
      throw error;
    }
  }

  async removeValidationRule(ruleId: string): Promise<void> {
    try {
      this.validationEngine.removeRule(ruleId);
      logger.info('Validation rule removed', { ruleId });
    } catch (error) {
      logger.error('Failed to remove validation rule', { error, ruleId });
      throw error;
    }
  }

  async enableValidationRule(ruleId: string): Promise<void> {
    try {
      this.validationEngine.enableRule(ruleId);
      logger.info('Validation rule enabled', { ruleId });
    } catch (error) {
      logger.error('Failed to enable validation rule', { error, ruleId });
      throw error;
    }
  }

  async disableValidationRule(ruleId: string): Promise<void> {
    try {
      this.validationEngine.disableRule(ruleId);
      logger.info('Validation rule disabled', { ruleId });
    } catch (error) {
      logger.error('Failed to disable validation rule', { error, ruleId });
      throw error;
    }
  }

  async validateContractCompliance(
    contract: any, 
    complianceStandards: string[] = ['openapi-3.0', 'rest-api-guidelines']
  ): Promise<ValidationResult> {
    try {
      logger.debug('Validating contract compliance', { 
        contractTitle: contract.info?.title, 
        standards: complianceStandards 
      });

      // Build validation options based on compliance standards
      const options: ValidationOptions = {
        strict: true,
        rules: this.getComplianceRules(complianceStandards),
      };

      const result = await this.validateContract(contract, options);

      // Add compliance-specific analysis
      const complianceAnalysis = this.analyzeCompliance(result, complianceStandards);
      
      return {
        ...result,
        complianceAnalysis,
      };
    } catch (error) {
      logger.error('Contract compliance validation failed', { error, standards: complianceStandards });
      throw error;
    }
  }

  async generateValidationReport(
    validationResults: ValidationResult[],
    options: {
      includeDetails?: boolean;
      groupByCategory?: boolean;
      format?: 'json' | 'html' | 'markdown';
    } = {}
  ): Promise<any> {
    try {
      const report = {
        summary: this.generateValidationSummary(validationResults),
        details: options.includeDetails ? validationResults : undefined,
        recommendations: this.generateRecommendations(validationResults),
        generatedAt: new Date().toISOString(),
      };

      if (options.groupByCategory) {
        report.categorizedResults = this.groupResultsByCategory(validationResults);
      }

      if (options.format === 'markdown') {
        return this.formatReportAsMarkdown(report);
      } else if (options.format === 'html') {
        return this.formatReportAsHTML(report);
      }

      return report;
    } catch (error) {
      logger.error('Failed to generate validation report', { error, options });
      throw error;
    }
  }

  private getComplianceRules(standards: string[]): string[] {
    const ruleMapping: Record<string, string[]> = {
      'openapi-3.0': ['openapi-version', 'required-info', 'operation-ids', 'response-schemas'],
      'rest-api-guidelines': ['security-schemes', 'operation-ids', 'response-schemas'],
      'asyncapi-2.0': ['asyncapi-version', 'required-info', 'channel-definitions'],
    };

    return standards.flatMap(standard => ruleMapping[standard] || []);
  }

  private analyzeCompliance(result: ValidationResult, standards: string[]): any {
    return {
      standards,
      overallCompliance: result.score >= 80 ? 'compliant' : 'non-compliant',
      complianceScore: result.score,
      criticalIssues: result.errors.filter(e => e.severity === 'error').length,
      recommendations: result.suggestions?.length || 0,
    };
  }

  private generateValidationSummary(results: ValidationResult[]): any {
    const totalContracts = results.length;
    const validContracts = results.filter(r => r.valid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalContracts;

    return {
      totalContracts,
      validContracts,
      invalidContracts: totalContracts - validContracts,
      validationRate: (validContracts / totalContracts) * 100,
      totalErrors,
      totalWarnings,
      averageScore,
      scoreDistribution: this.calculateScoreDistribution(results),
    };
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    // Common error patterns
    const errorCounts = new Map<string, number>();
    results.forEach(result => {
      result.errors.forEach(error => {
        errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
      });
    });

    // Generate recommendations based on common issues
    errorCounts.forEach((count, code) => {
      if (count > results.length * 0.3) { // More than 30% of contracts have this issue
        recommendations.push(`Address "${code}" issue found in ${count} contracts`);
      }
    });

    // Score-based recommendations
    const lowScoreContracts = results.filter(r => r.score < 60).length;
    if (lowScoreContracts > 0) {
      recommendations.push(`Improve ${lowScoreContracts} contracts with validation scores below 60`);
    }

    return recommendations;
  }

  private groupResultsByCategory(results: ValidationResult[]): any {
    const categories = new Map<string, ValidationResult[]>();
    
    results.forEach(result => {
      // Group by error categories
      const errorCategories = result.errors.map(e => e.code.split('-')[0]).filter(Boolean);
      const category = errorCategories.length > 0 ? errorCategories[0] : 'general';
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    });

    return Object.fromEntries(categories);
  }

  private calculateScoreDistribution(results: ValidationResult[]): any {
    const distribution = {
      excellent: 0, // 90-100
      good: 0,      // 70-89
      fair: 0,      // 50-69
      poor: 0,      // 0-49
    };

    results.forEach(result => {
      if (result.score >= 90) distribution.excellent++;
      else if (result.score >= 70) distribution.good++;
      else if (result.score >= 50) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }

  private formatReportAsMarkdown(report: any): string {
    return `
# Validation Report

Generated on: ${report.generatedAt}

## Summary

- **Total Contracts**: ${report.summary.totalContracts}
- **Valid Contracts**: ${report.summary.validContracts}
- **Invalid Contracts**: ${report.summary.invalidContracts}
- **Validation Rate**: ${report.summary.validationRate.toFixed(2)}%
- **Average Score**: ${report.summary.averageScore.toFixed(2)}
- **Total Errors**: ${report.summary.totalErrors}
- **Total Warnings**: ${report.summary.totalWarnings}

## Score Distribution

- **Excellent (90-100)**: ${report.summary.scoreDistribution.excellent}
- **Good (70-89)**: ${report.summary.scoreDistribution.good}
- **Fair (50-69)**: ${report.summary.scoreDistribution.fair}
- **Poor (0-49)**: ${report.summary.scoreDistribution.poor}

## Recommendations

${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
  }

  private formatReportAsHTML(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Validation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
    .recommendations { margin-top: 20px; }
    .recommendations li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>Validation Report</h1>
  <p><strong>Generated on:</strong> ${report.generatedAt}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="metric">
      <strong>Total Contracts:</strong> ${report.summary.totalContracts}
    </div>
    <div class="metric">
      <strong>Valid Contracts:</strong> ${report.summary.validContracts}
    </div>
    <div class="metric">
      <strong>Validation Rate:</strong> ${report.summary.validationRate.toFixed(2)}%
    </div>
    <div class="metric">
      <strong>Average Score:</strong> ${report.summary.averageScore.toFixed(2)}
    </div>
  </div>
  
  <div class="recommendations">
    <h2>Recommendations</h2>
    <ul>
      ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
    </ul>
  </div>
</body>
</html>
`;
  }
}