import {
  Standard,
  StandardsRule,
  StandardsSeverity,
  StandardsCategory,
  EnforcementLevel,
  ComplianceReport,
  FileComplianceReport,
  ComplianceSummary,
  ComplianceTrends,
  StandardsViolation,
  ValidationResult,
  TeamStandards,
  StandardsTemplate,
  Language,
  ComplianceMetrics,
  AIInsights,
  Recommendation,
  CodeAnalysisResult,
  FileAnalysis,
  ComplexityMetrics,
  ImprovementSuggestion
} from '../types/standards-types.js';

/**
 * Comprehensive mock data service for Standards Engine
 * Provides realistic mock data for testing and development
 */
export class MockDataService {
  private readonly teamIds = [
    '550e8400-e29b-41d4-a716-446655440000',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
  ];

  private readonly projectIds = [
    'proj-frontend-app',
    'proj-backend-api', 
    'proj-mobile-client',
    'proj-data-pipeline'
  ];

  private readonly commitIds = [
    'abc123def456',
    'def456ghi789',
    'ghi789jkl012',
    'jkl012mno345'
  ];

  /**
   * Generate realistic TypeScript standards rules
   */
  getTypeScriptStandardsRules(): StandardsRule[] {
    return [
      {
        id: 'ts-no-var',
        description: 'Use const or let instead of var',
        severity: StandardsSeverity.ERROR,
        pattern: '\\bvar\\s+',
        examples: {
          good: ['const name = "value";', 'let counter = 0;'],
          bad: ['var name = "value";', 'var counter = 0;']
        },
        autoFixable: true,
        tags: ['typescript', 'es6', 'variables']
      },
      {
        id: 'ts-prefer-const',
        description: 'Prefer const for variables that are never reassigned',
        severity: StandardsSeverity.WARNING,
        pattern: 'let\\s+\\w+\\s*=\\s*[^;]+;(?![\\s\\S]*\\1\\s*=)',
        examples: {
          good: ['const PI = 3.14159;'],
          bad: ['let PI = 3.14159;']
        },
        autoFixable: true,
        tags: ['typescript', 'immutability']
      },
      {
        id: 'ts-explicit-return-type',
        description: 'Functions should have explicit return types',
        severity: StandardsSeverity.WARNING,
        pattern: 'function\\s+\\w+\\([^)]*\\)\\s*{',
        examples: {
          good: ['function getName(): string {'],
          bad: ['function getName() {']
        },
        autoFixable: false,
        tags: ['typescript', 'types', 'functions']
      },
      {
        id: 'ts-no-any',
        description: 'Avoid using any type',
        severity: StandardsSeverity.ERROR,
        pattern: ':\\s*any\\b',
        examples: {
          good: ['const data: unknown = response;'],
          bad: ['const data: any = response;']
        },
        autoFixable: false,
        tags: ['typescript', 'types', 'safety']
      },
      {
        id: 'ts-interface-naming',
        description: 'Interface names should start with I or use PascalCase',
        severity: StandardsSeverity.INFO,
        pattern: 'interface\\s+[a-z]',
        examples: {
          good: ['interface IUser {', 'interface UserProfile {'],
          bad: ['interface user {', 'interface userProfile {']
        },
        autoFixable: false,
        tags: ['typescript', 'naming', 'conventions']
      }
    ];
  }

  /**
   * Generate realistic Python standards rules
   */
  getPythonStandardsRules(): StandardsRule[] {
    return [
      {
        id: 'py-pep8-line-length',
        description: 'Line length should not exceed 88 characters',
        severity: StandardsSeverity.WARNING,
        pattern: '^.{89,}$',
        examples: {
          good: ['def short_function_name():'],
          bad: ['def this_is_a_very_long_function_name_that_exceeds_the_line_length_limit():']
        },
        autoFixable: false,
        tags: ['python', 'pep8', 'formatting']
      },
      {
        id: 'py-docstring-required',
        description: 'Public functions must have docstrings',
        severity: StandardsSeverity.ERROR,
        pattern: 'def\\s+[^_]\\w*\\([^)]*\\):\\s*(?!""")',
        examples: {
          good: ['def func():\n    """Function description."""'],
          bad: ['def func():\n    pass']
        },
        autoFixable: false,
        tags: ['python', 'documentation', 'docstrings']
      },
      {
        id: 'py-type-hints',
        description: 'Function parameters and return values should have type hints',
        severity: StandardsSeverity.WARNING,
        pattern: 'def\\s+\\w+\\([^)]*[^:]\\)\\s*:',
        examples: {
          good: ['def add(a: int, b: int) -> int:'],
          bad: ['def add(a, b):']
        },
        autoFixable: false,
        tags: ['python', 'typing', 'annotations']
      }
    ];
  }

  /**
   * Generate standards for different categories
   */
  getStandardsByCategory(category: StandardsCategory, language?: Language): Standard[] {
    const baseStandards: Record<StandardsCategory, Standard[]> = {
      [StandardsCategory.CODING]: [
        {
          id: 'std-ts-best-practices',
          name: 'TypeScript Best Practices',
          description: 'Core TypeScript development standards',
          category: StandardsCategory.CODING,
          rules: this.getTypeScriptStandardsRules(),
          active: true,
          version: '1.2.0',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-02-01T14:30:00Z'
        },
        {
          id: 'std-py-best-practices',
          name: 'Python Best Practices',
          description: 'PEP 8 and modern Python standards',
          category: StandardsCategory.CODING,
          rules: this.getPythonStandardsRules(),
          active: true,
          version: '2.1.0',
          createdAt: '2024-01-10T09:00:00Z',
          updatedAt: '2024-01-25T16:45:00Z'
        }
      ],
      [StandardsCategory.TESTING]: [
        {
          id: 'std-testing-practices',
          name: 'Testing Standards',
          description: 'Comprehensive testing requirements',
          category: StandardsCategory.TESTING,
          rules: [
            {
              id: 'test-coverage-minimum',
              description: 'Minimum 80% test coverage required',
              severity: StandardsSeverity.ERROR,
              autoFixable: false,
              tags: ['testing', 'coverage']
            },
            {
              id: 'test-naming-convention',
              description: 'Test files should end with .test.ts or .spec.ts',
              severity: StandardsSeverity.WARNING,
              pattern: '\\.test\\.(ts|js)$|\\.spec\\.(ts|js)$',
              autoFixable: false,
              tags: ['testing', 'naming']
            }
          ],
          active: true,
          version: '1.0.0'
        }
      ],
      [StandardsCategory.DOCUMENTATION]: [
        {
          id: 'std-documentation',
          name: 'Documentation Standards',
          description: 'Code documentation requirements',
          category: StandardsCategory.DOCUMENTATION,
          rules: [
            {
              id: 'readme-required',
              description: 'All projects must have a README.md file',
              severity: StandardsSeverity.ERROR,
              autoFixable: false,
              tags: ['documentation', 'readme']
            },
            {
              id: 'api-documentation',
              description: 'Public APIs must be documented',
              severity: StandardsSeverity.WARNING,
              autoFixable: false,
              tags: ['documentation', 'api']
            }
          ],
          active: true,
          version: '1.1.0'
        }
      ],
      [StandardsCategory.SECURITY]: [
        {
          id: 'std-security-practices',
          name: 'Security Standards',
          description: 'Security best practices and requirements',
          category: StandardsCategory.SECURITY,
          rules: [
            {
              id: 'no-hardcoded-secrets',
              description: 'No hardcoded passwords or API keys',
              severity: StandardsSeverity.ERROR,
              pattern: '(password|apikey|secret)\\s*[=:]\\s*["\'][^"\']+["\']',
              autoFixable: false,
              tags: ['security', 'secrets']
            },
            {
              id: 'validate-inputs',
              description: 'All user inputs must be validated',
              severity: StandardsSeverity.ERROR,
              autoFixable: false,
              tags: ['security', 'validation']
            }
          ],
          active: true,
          version: '2.0.0'
        }
      ],
      [StandardsCategory.ARCHITECTURE]: [
        {
          id: 'std-architecture',
          name: 'Architecture Standards',
          description: 'System architecture and design patterns',
          category: StandardsCategory.ARCHITECTURE,
          rules: [
            {
              id: 'single-responsibility',
              description: 'Classes should have a single responsibility',
              severity: StandardsSeverity.WARNING,
              autoFixable: false,
              tags: ['architecture', 'solid']
            },
            {
              id: 'dependency-injection',
              description: 'Use dependency injection for external dependencies',
              severity: StandardsSeverity.WARNING,
              autoFixable: false,
              tags: ['architecture', 'dependency-injection']
            }
          ],
          active: true,
          version: '1.0.0'
        }
      ]
    };

    return baseStandards[category] || [];
  }

  /**
   * Generate realistic team standards
   */
  generateTeamStandards(teamId: string): TeamStandards {
    const allStandards = Object.values(StandardsCategory)
      .flatMap(category => this.getStandardsByCategory(category));

    return {
      teamId,
      standards: allStandards,
      enforcementLevel: EnforcementLevel.WARNING,
      lastUpdated: new Date().toISOString(),
      totalRules: allStandards.reduce((total, std) => total + std.rules.length, 0)
    };
  }

  /**
   * Generate realistic violations based on code patterns
   */
  generateRealisticViolations(code: string, rules: StandardsRule[]): StandardsViolation[] {
    const violations: StandardsViolation[] = [];

    // Simulate pattern matching for common violations
    rules.forEach(rule => {
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, 'g');
        let match;
        let lineNumber = 1;
        let columnNumber = 1;

        const lines = code.split('\n');
        
        lines.forEach((line, index) => {
          if (regex.test(line)) {
            violations.push({
              standardId: 'std-dynamic',
              ruleId: rule.id,
              severity: rule.severity,
              message: rule.description,
              line: index + 1,
              column: line.search(regex) + 1,
              suggestion: this.generateSuggestion(rule),
              fixAvailable: rule.autoFixable,
              autoFixable: rule.autoFixable
            });
          }
        });
      }
    });

    // Add some random violations to make it more realistic
    const randomViolations = this.generateRandomViolations();
    violations.push(...randomViolations.slice(0, Math.floor(Math.random() * 3)));

    return violations;
  }

  /**
   * Generate random violations for more realistic scenarios
   */
  private generateRandomViolations(): StandardsViolation[] {
    const commonViolations = [
      {
        standardId: 'std-ts-best-practices',
        ruleId: 'ts-unused-variable',
        severity: StandardsSeverity.WARNING,
        message: 'Variable is declared but never used',
        line: Math.floor(Math.random() * 50) + 1,
        column: Math.floor(Math.random() * 80) + 1,
        suggestion: 'Remove unused variable or prefix with underscore',
        fixAvailable: true,
        autoFixable: true
      },
      {
        standardId: 'std-ts-best-practices', 
        ruleId: 'ts-console-log',
        severity: StandardsSeverity.INFO,
        message: 'console.log found in production code',
        line: Math.floor(Math.random() * 50) + 1,
        column: Math.floor(Math.random() * 80) + 1,
        suggestion: 'Use proper logging instead of console.log',
        fixAvailable: false,
        autoFixable: false
      },
      {
        standardId: 'std-security-practices',
        ruleId: 'potential-sql-injection',
        severity: StandardsSeverity.ERROR,
        message: 'Potential SQL injection vulnerability',
        line: Math.floor(Math.random() * 50) + 1,
        column: Math.floor(Math.random() * 80) + 1,
        suggestion: 'Use parameterized queries',
        fixAvailable: false,
        autoFixable: false
      }
    ];

    return commonViolations;
  }

  /**
   * Generate helpful suggestions for rule violations
   */
  private generateSuggestion(rule: StandardsRule): string {
    const suggestions: Record<string, string> = {
      'ts-no-var': 'Replace "var" with "const" for constants or "let" for variables',
      'ts-prefer-const': 'Use "const" instead of "let" for variables that are never reassigned',
      'ts-explicit-return-type': 'Add explicit return type annotation to the function',
      'ts-no-any': 'Use more specific types instead of "any"',
      'py-pep8-line-length': 'Break long lines into multiple lines',
      'py-docstring-required': 'Add a docstring explaining what this function does'
    };

    return suggestions[rule.id] || 'Please review this code against the coding standards';
  }

  /**
   * Calculate compliance score based on violations
   */
  calculateComplianceScore(violations: StandardsViolation[]): number {
    if (violations.length === 0) return 100;

    const errorWeight = 10;
    const warningWeight = 5;
    const infoWeight = 1;

    const totalDeductions = violations.reduce((total, violation) => {
      switch (violation.severity) {
        case StandardsSeverity.ERROR:
          return total + errorWeight;
        case StandardsSeverity.WARNING:
          return total + warningWeight;
        case StandardsSeverity.INFO:
          return total + infoWeight;
        default:
          return total;
      }
    }, 0);

    const score = Math.max(0, 100 - totalDeductions);
    return Math.round(score);
  }

  /**
   * Generate realistic validation result
   */
  generateValidationResult(code: string, teamId: string): ValidationResult {
    const standards = this.generateTeamStandards(teamId);
    const allRules = standards.standards.flatMap(std => std.rules);
    const violations = this.generateRealisticViolations(code, allRules);
    const score = this.calculateComplianceScore(violations);

    return {
      overallScore: score,
      violations,
      passedRules: allRules.length - violations.length,
      totalRules: allRules.length,
      analysisTime: Math.random() * 2000 + 500, // 500-2500ms
      suggestions: this.generateImprovementSuggestions(violations)
    };
  }

  /**
   * Generate improvement suggestions based on violations
   */
  private generateImprovementSuggestions(violations: StandardsViolation[]): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    if (violations.some(v => v.severity === StandardsSeverity.ERROR)) {
      suggestions.push({
        type: 'refactor',
        title: 'Fix Critical Issues',
        description: 'Address all error-level violations to improve code quality',
        impact: 'high',
        effort: 'medium',
        codeExample: '// Fix critical issues first for stable code'
      });
    }

    if (violations.length > 10) {
      suggestions.push({
        type: 'optimization',
        title: 'Code Review Process',
        description: 'Consider implementing automated code review to catch issues early',
        impact: 'medium',
        effort: 'low'
      });
    }

    return suggestions;
  }

  /**
   * Generate realistic file compliance report
   */
  generateFileComplianceReport(filePath: string, language: Language): FileComplianceReport {
    const mockCode = this.generateMockCodeForLanguage(language);
    const standards = this.generateTeamStandards(this.teamIds[0]);
    const languageRules = standards.standards
      .filter(std => std.name.toLowerCase().includes(language.toLowerCase()))
      .flatMap(std => std.rules);
    
    const violations = this.generateRealisticViolations(mockCode, languageRules);
    const score = this.calculateComplianceScore(violations);

    return {
      filePath,
      language,
      score,
      violations,
      linesAnalyzed: Math.floor(Math.random() * 500) + 50,
      complexityScore: Math.random() * 10 + 1
    };
  }

  /**
   * Generate mock code for different languages
   */
  private generateMockCodeForLanguage(language: Language): string {
    const codeTemplates: Record<Language, string> = {
      [Language.TYPESCRIPT]: `
        var oldVariable = "should use const";
        let unchangedValue = "should be const";
        function getData() {
          return fetch('/api/data');
        }
        const user: any = getCurrentUser();
      `,
      [Language.PYTHON]: `
        def very_long_function_name_that_exceeds_recommended_line_length_limits():
            pass
        
        def public_function():
            return "missing docstring"
        
        def process_data(data):
            return data * 2
      `,
      [Language.JAVASCRIPT]: `
        var oldStyle = "deprecated";
        function processUser(user) {
          console.log(user);
          return user.name;
        }
      `,
      [Language.JAVA]: `
        public class Example {
          private String password = "hardcoded123";
          public void process() {
            // Missing documentation
          }
        }
      `,
      [Language.GO]: `
        package main
        
        func processData(data string) {
          fmt.Println(data)
        }
      `,
      [Language.RUST]: `
        fn process_data(data: &str) {
          println!("{}", data);
        }
      `,
      [Language.PHP]: `
        <?php
        function processData($data) {
          echo $data;
        }
        ?>
      `
    };

    return codeTemplates[language] || 'console.log("mock code");';
  }

  /**
   * Generate comprehensive compliance report
   */
  generateComplianceReport(commitId: string, projectId: string): ComplianceReport {
    const fileReports = [
      this.generateFileComplianceReport('src/components/UserProfile.tsx', Language.TYPESCRIPT),
      this.generateFileComplianceReport('src/utils/helpers.ts', Language.TYPESCRIPT),
      this.generateFileComplianceReport('src/services/api.ts', Language.TYPESCRIPT),
      this.generateFileComplianceReport('scripts/deploy.py', Language.PYTHON)
    ];

    const totalViolations = fileReports.reduce((total, report) => 
      total + report.violations.length, 0);
    
    const averageScore = fileReports.reduce((total, report) => 
      total + report.score, 0) / fileReports.length;

    const violationsBySeverity = fileReports.reduce((acc, report) => {
      report.violations.forEach(violation => {
        acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const summary: ComplianceSummary = {
      totalFiles: fileReports.length,
      filesWithViolations: fileReports.filter(r => r.violations.length > 0).length,
      totalViolations,
      violationsBySeverity: {
        error: violationsBySeverity[StandardsSeverity.ERROR] || 0,
        warning: violationsBySeverity[StandardsSeverity.WARNING] || 0,
        info: violationsBySeverity[StandardsSeverity.INFO] || 0
      }
    };

    const trends: ComplianceTrends = {
      scoreTrend: Math.random() > 0.5 ? 'improving' : 'stable',
      previousScore: averageScore - (Math.random() * 10 - 5),
      scoreChange: Math.random() * 10 - 5
    };

    return {
      commitId,
      projectId,
      overallScore: Math.round(averageScore),
      fileReports,
      summary,
      trends,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate compliance metrics for a project
   */
  generateComplianceMetrics(projectId: string, timeframe = 'month'): ComplianceMetrics {
    const generateScoreTrend = () => {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
      const trend = [];
      let baseScore = 75 + Math.random() * 20;

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        baseScore += (Math.random() - 0.5) * 5;
        baseScore = Math.max(0, Math.min(100, baseScore));
        
        trend.push({
          date: date.toISOString().split('T')[0],
          score: Math.round(baseScore)
        });
      }
      return trend;
    };

    return {
      projectId,
      timeframe,
      metrics: {
        averageScore: 82.5,
        scoreTrend: generateScoreTrend(),
        violationTrends: {
          total: [
            { date: '2024-01-01', count: 45 },
            { date: '2024-01-15', count: 38 },
            { date: '2024-01-30', count: 32 }
          ],
          bySeverity: {
            error: [{ date: '2024-01-01', count: 12 }],
            warning: [{ date: '2024-01-01', count: 23 }],
            info: [{ date: '2024-01-01', count: 10 }]
          }
        },
        topViolations: [
          {
            ruleId: 'ts-no-var',
            ruleName: 'No var declarations',
            count: 15,
            trend: 'decreasing'
          },
          {
            ruleId: 'ts-prefer-const',
            ruleName: 'Prefer const',
            count: 12,
            trend: 'stable'
          }
        ],
        teamPerformance: {
          commitsAnalyzed: 150,
          improvementRate: 0.15,
          consistencyScore: 0.85
        }
      }
    };
  }

  /**
   * Generate standards templates
   */
  generateStandardsTemplates(language?: Language, framework?: string): StandardsTemplate[] {
    const templates: StandardsTemplate[] = [
      {
        id: 'tmpl-typescript-react',
        name: 'TypeScript + React Best Practices',
        description: 'Comprehensive standards for TypeScript React applications',
        language: Language.TYPESCRIPT,
        framework: 'react',
        category: 'frontend',
        standards: this.getStandardsByCategory(StandardsCategory.CODING, Language.TYPESCRIPT),
        usageCount: 245,
        rating: 4.8,
        createdBy: 'Standards Team',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'tmpl-python-django',
        name: 'Python + Django Standards',
        description: 'Best practices for Django web applications',
        language: Language.PYTHON,
        framework: 'django',
        category: 'backend',
        standards: this.getStandardsByCategory(StandardsCategory.CODING, Language.PYTHON),
        usageCount: 180,
        rating: 4.6,
        createdBy: 'Backend Team',
        createdAt: '2024-01-15T00:00:00Z'
      },
      {
        id: 'tmpl-security-general',
        name: 'General Security Standards',
        description: 'Language-agnostic security best practices',
        language: Language.TYPESCRIPT, // Default language
        category: 'security',
        standards: this.getStandardsByCategory(StandardsCategory.SECURITY),
        usageCount: 320,
        rating: 4.9,
        createdBy: 'Security Team',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    let filtered = templates;

    if (language) {
      filtered = filtered.filter(t => t.language === language);
    }

    if (framework) {
      filtered = filtered.filter(t => t.framework === framework);
    }

    return filtered;
  }

  /**
   * Generate AI insights for code analysis
   */
  generateAIInsights(violations: StandardsViolation[]): AIInsights {
    const severityCount = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const insights: AIInsights = {
      overallAssessment: this.generateOverallAssessment(violations.length, severityCount),
      keyPatterns: this.generateKeyPatterns(violations),
      improvementPriorities: this.generateImprovementPriorities(severityCount),
      learningOpportunities: [
        'Consider setting up automated code formatting with Prettier',
        'Implement pre-commit hooks to catch issues early',
        'Review team coding standards documentation'
      ]
    };

    return insights;
  }

  private generateOverallAssessment(violationCount: number, severityCount: Record<string, number>): string {
    if (violationCount === 0) {
      return 'Excellent code quality! No standards violations detected.';
    }

    if (severityCount[StandardsSeverity.ERROR] > 0) {
      return `Code has ${violationCount} violations including ${severityCount[StandardsSeverity.ERROR]} critical errors that should be addressed immediately.`;
    }

    if (violationCount < 5) {
      return 'Good code quality with minor issues that can be easily addressed.';
    }

    return `Code quality needs improvement. Found ${violationCount} violations across different severity levels.`;
  }

  private generateKeyPatterns(violations: StandardsViolation[]): string[] {
    const patterns = [];

    if (violations.some(v => v.ruleId.includes('var'))) {
      patterns.push('Usage of deprecated var declarations');
    }

    if (violations.some(v => v.ruleId.includes('type'))) {
      patterns.push('Missing or incorrect type annotations');
    }

    if (violations.some(v => v.ruleId.includes('security'))) {
      patterns.push('Potential security vulnerabilities');
    }

    if (violations.length > 10) {
      patterns.push('High number of style violations');
    }

    return patterns.length > 0 ? patterns : ['Code generally follows standards'];
  }

  private generateImprovementPriorities(severityCount: Record<string, number>): Array<{
    area: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> {
    const priorities = [];

    if (severityCount[StandardsSeverity.ERROR] > 0) {
      priorities.push({
        area: 'Critical Issues',
        priority: 'critical' as const,
        description: 'Fix all error-level violations immediately'
      });
    }

    if (severityCount[StandardsSeverity.WARNING] > 5) {
      priorities.push({
        area: 'Code Quality',
        priority: 'high' as const,
        description: 'Address warning-level violations to improve maintainability'
      });
    }

    if (severityCount[StandardsSeverity.INFO] > 0) {
      priorities.push({
        area: 'Style Consistency',
        priority: 'medium' as const,
        description: 'Apply consistent coding style across the codebase'
      });
    }

    return priorities;
  }

  /**
   * Utility method to add realistic delays for async operations
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random values within a range
   */
  randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate UUIDs for mock data
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}