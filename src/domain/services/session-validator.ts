import { InvalidSessionDataError, SessionStorageError } from '../errors/session-errors.js';
import type { SessionContext } from '../entities/session.js';
import type { SessionStateDto } from '../../application/dtos/session-dto.js';

/**
 * Validation result for session state
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  repaired?: Partial<SessionStateDto>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  severity: 'critical' | 'error';
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Session validation rules configuration
 */
export interface ValidationRules {
  maxContextSize: number;
  maxActiveIssues: number;
  maxStringLength: number;
  allowedWorkflowStages?: string[];
  requireProjectId: boolean;
}

/**
 * Default validation rules
 */
const DEFAULT_RULES: ValidationRules = {
  maxContextSize: 1024 * 1024, // 1MB
  maxActiveIssues: 100,
  maxStringLength: 1000,
  requireProjectId: false,
};

/**
 * Domain service for validating session state integrity
 */
export class SessionValidator {
  private readonly rules: ValidationRules;

  constructor(rules: Partial<ValidationRules> = {}) {
    this.rules = { ...DEFAULT_RULES, ...rules };
  }

  /**
   * Validate session state for restoration
   */
  validateSessionState(sessionDto: SessionStateDto): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let repaired: Partial<SessionStateDto> | undefined;

    // Validate session key
    if (!this.isValidSessionKey(sessionDto.sessionKey)) {
      errors.push({
        field: 'sessionKey',
        message: 'Invalid session key format',
        value: sessionDto.sessionKey,
        severity: 'critical',
      });
    }

    // Validate project ID
    if (this.rules.requireProjectId && !sessionDto.projectId) {
      errors.push({
        field: 'projectId',
        message: 'Project ID is required but missing',
        severity: 'error',
      });
    }

    // Validate timestamps
    const timestampValidation = this.validateTimestamps(sessionDto);
    if (!timestampValidation.isValid) {
      errors.push(...timestampValidation.errors);
      if (timestampValidation.repaired) {
        repaired = { ...repaired, ...timestampValidation.repaired };
      }
    }

    // Validate context
    const contextValidation = this.validateContext(sessionDto.currentContext);
    if (!contextValidation.isValid) {
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);
      if (contextValidation.repaired) {
        repaired = { ...repaired, currentContext: contextValidation.repaired as SessionContext };
      }
    }

    // Check for data corruption indicators
    const corruptionCheck = this.checkForCorruption(sessionDto);
    if (!corruptionCheck.isValid) {
      errors.push(...corruptionCheck.errors);
    }

    return {
      isValid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      repaired,
    };
  }

  /**
   * Validate session key format
   */
  private isValidSessionKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Session keys should be UUIDs or similar format
    // Format: alphanumeric with hyphens, 8-36 characters
    const keyPattern = /^[a-zA-Z0-9-]{8,36}$/;
    return keyPattern.test(key);
  }

  /**
   * Validate timestamps
   */
  private validateTimestamps(sessionDto: SessionStateDto): {
    isValid: boolean;
    errors: ValidationError[];
    repaired?: Partial<SessionStateDto>;
  } {
    const errors: ValidationError[] = [];
    let repaired: Partial<SessionStateDto> | undefined;

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Validate createdAt
    const createdAt = new Date(sessionDto.createdAt);
    if (isNaN(createdAt.getTime())) {
      errors.push({
        field: 'createdAt',
        message: 'Invalid creation timestamp',
        value: sessionDto.createdAt,
        severity: 'critical',
      });
    } else if (createdAt < oneYearAgo || createdAt > now) {
      errors.push({
        field: 'createdAt',
        message: 'Creation timestamp is outside reasonable range',
        value: createdAt.toISOString(),
        severity: 'error',
      });
    }

    // Validate lastActivity
    const lastActivity = new Date(sessionDto.lastActivity);
    if (isNaN(lastActivity.getTime())) {
      errors.push({
        field: 'lastActivity',
        message: 'Invalid last activity timestamp',
        value: sessionDto.lastActivity,
        severity: 'critical',
      });
    } else if (lastActivity > now) {
      errors.push({
        field: 'lastActivity',
        message: 'Last activity timestamp is in the future',
        value: lastActivity.toISOString(),
        severity: 'error',
      });
    }

    // Validate updatedAt
    const updatedAt = new Date(sessionDto.updatedAt);
    if (isNaN(updatedAt.getTime())) {
      errors.push({
        field: 'updatedAt',
        message: 'Invalid update timestamp',
        value: sessionDto.updatedAt,
        severity: 'critical',
      });
    }

    // Check timestamp consistency
    if (!isNaN(createdAt.getTime()) && !isNaN(lastActivity.getTime())) {
      if (lastActivity < createdAt) {
        // Attempt repair: set lastActivity to createdAt
        repaired = {
          lastActivity: createdAt,
        };
        errors.push({
          field: 'lastActivity',
          message: 'Last activity is before creation time (will be repaired)',
          severity: 'error',
        });
      }
    }

    if (!isNaN(createdAt.getTime()) && !isNaN(updatedAt.getTime())) {
      if (updatedAt < createdAt) {
        // Attempt repair: set updatedAt to createdAt
        repaired = {
          ...repaired,
          updatedAt: createdAt,
        };
        errors.push({
          field: 'updatedAt',
          message: 'Update time is before creation time (will be repaired)',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      repaired,
    };
  }

  /**
   * Validate session context
   */
  private validateContext(context: SessionContext): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    repaired?: SessionContext;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let repaired: SessionContext | undefined;

    if (!context || typeof context !== 'object') {
      // Context should be an object, repair by providing empty object
      repaired = {};
      errors.push({
        field: 'currentContext',
        message: 'Context is not a valid object (will be repaired)',
        value: context,
        severity: 'error',
      });
      return { isValid: false, errors, warnings, repaired };
    }

    // Validate activeIssues
    if (context.activeIssues !== undefined) {
      if (!Array.isArray(context.activeIssues)) {
        errors.push({
          field: 'currentContext.activeIssues',
          message: 'Active issues must be an array',
          value: context.activeIssues,
          severity: 'error',
        });
        // Repair by converting to empty array
        repaired = { ...context, activeIssues: [] };
      } else {
        // Validate array contents
        const validIssues = context.activeIssues.filter(issue => typeof issue === 'string');
        if (validIssues.length !== context.activeIssues.length) {
          errors.push({
            field: 'currentContext.activeIssues',
            message: 'Some active issues are not strings (will be filtered)',
            severity: 'error',
          });
          repaired = { ...context, activeIssues: validIssues };
        }

        // Check for duplicates
        const uniqueIssues = [...new Set(validIssues)];
        if (uniqueIssues.length !== validIssues.length) {
          warnings.push({
            field: 'currentContext.activeIssues',
            message: 'Duplicate issues found',
            suggestion: 'Remove duplicate issue IDs',
          });
          repaired = { ...repaired || context, activeIssues: uniqueIssues };
        }

        // Check count limit
        if (uniqueIssues.length > this.rules.maxActiveIssues) {
          warnings.push({
            field: 'currentContext.activeIssues',
            message: `Too many active issues (${uniqueIssues.length} > ${this.rules.maxActiveIssues})`,
            suggestion: 'Consider cleaning up old issues',
          });
        }
      }
    }

    // Validate workflowStage
    if (context.workflowStage !== undefined) {
      if (typeof context.workflowStage !== 'string') {
        errors.push({
          field: 'currentContext.workflowStage',
          message: 'Workflow stage must be a string',
          value: context.workflowStage,
          severity: 'error',
        });
        repaired = { ...repaired || context, workflowStage: undefined };
      } else if (context.workflowStage.length > this.rules.maxStringLength) {
        errors.push({
          field: 'currentContext.workflowStage',
          message: `Workflow stage too long (${context.workflowStage.length} > ${this.rules.maxStringLength})`,
          severity: 'error',
        });
        repaired = { ...repaired || context, workflowStage: context.workflowStage.substring(0, this.rules.maxStringLength) };
      } else if (this.rules.allowedWorkflowStages && !this.rules.allowedWorkflowStages.includes(context.workflowStage)) {
        warnings.push({
          field: 'currentContext.workflowStage',
          message: `Unknown workflow stage: ${context.workflowStage}`,
          suggestion: `Use one of: ${this.rules.allowedWorkflowStages.join(', ')}`,
        });
      }
    }

    // Validate lastAction
    if (context.lastAction !== undefined) {
      if (typeof context.lastAction !== 'string') {
        errors.push({
          field: 'currentContext.lastAction',
          message: 'Last action must be a string',
          value: context.lastAction,
          severity: 'error',
        });
        repaired = { ...repaired || context, lastAction: undefined };
      } else if (context.lastAction.length > this.rules.maxStringLength) {
        errors.push({
          field: 'currentContext.lastAction',
          message: `Last action too long (${context.lastAction.length} > ${this.rules.maxStringLength})`,
          severity: 'error',
        });
        repaired = { ...repaired || context, lastAction: context.lastAction.substring(0, this.rules.maxStringLength) };
      }
    }

    // Validate contextData
    if (context.contextData !== undefined) {
      if (!context.contextData || typeof context.contextData !== 'object' || Array.isArray(context.contextData)) {
        errors.push({
          field: 'currentContext.contextData',
          message: 'Context data must be a valid object',
          value: context.contextData,
          severity: 'error',
        });
        repaired = { ...repaired || context, contextData: undefined };
      } else {
        // Check size
        const contextSize = JSON.stringify(context.contextData).length;
        if (contextSize > this.rules.maxContextSize) {
          errors.push({
            field: 'currentContext.contextData',
            message: `Context data too large (${contextSize} > ${this.rules.maxContextSize})`,
            severity: 'error',
          });
          repaired = { ...repaired || context, contextData: undefined };
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      repaired,
    };
  }

  /**
   * Check for signs of data corruption
   */
  private checkForCorruption(sessionDto: SessionStateDto): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    // Check for null bytes or control characters in strings
    const stringFields = [
      { field: 'sessionKey', value: sessionDto.sessionKey },
      { field: 'projectId', value: sessionDto.projectId },
    ];

    for (const { field, value } of stringFields) {
      if (value && typeof value === 'string') {
        if (value.includes('\0')) {
          errors.push({
            field,
            message: 'Field contains null bytes (possible corruption)',
            severity: 'critical',
          });
        }
        // Check for non-printable characters (except common whitespace)
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
          errors.push({
            field,
            message: 'Field contains control characters (possible corruption)',
            severity: 'critical',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect conflicts between sessions
   */
  detectConflicts(session1: SessionStateDto, session2: SessionStateDto): {
    hasConflicts: boolean;
    conflicts: ConflictDetail[];
  } {
    const conflicts: ConflictDetail[] = [];

    // Check if both sessions claim the same project
    if (session1.projectId && session1.projectId === session2.projectId) {
      // Check for overlapping active issues
      const issues1 = new Set(session1.currentContext.activeIssues || []);
      const issues2 = new Set(session2.currentContext.activeIssues || []);
      const overlapping = [...issues1].filter(issue => issues2.has(issue));

      if (overlapping.length > 0) {
        conflicts.push({
          type: 'overlapping_issues',
          field: 'activeIssues',
          description: `Both sessions are working on the same issues: ${overlapping.join(', ')}`,
          session1Value: session1.currentContext.activeIssues,
          session2Value: session2.currentContext.activeIssues,
          resolution: 'merge',
        });
      }

      // Check for workflow stage conflicts
      if (
        session1.currentContext.workflowStage &&
        session2.currentContext.workflowStage &&
        session1.currentContext.workflowStage !== session2.currentContext.workflowStage
      ) {
        conflicts.push({
          type: 'workflow_divergence',
          field: 'workflowStage',
          description: 'Sessions have different workflow stages for the same project',
          session1Value: session1.currentContext.workflowStage,
          session2Value: session2.currentContext.workflowStage,
          resolution: 'use_latest',
        });
      }
    }

    // Check for timestamp conflicts (sessions claiming to be active at impossible times)
    const session1Active = new Date(session1.lastActivity);
    const session2Active = new Date(session2.lastActivity);
    const timeDiff = Math.abs(session1Active.getTime() - session2Active.getTime());

    // If both sessions claim activity within 1 second, likely a conflict
    if (timeDiff < 1000) {
      conflicts.push({
        type: 'concurrent_activity',
        field: 'lastActivity',
        description: 'Sessions have near-identical activity timestamps (possible duplication)',
        session1Value: session1.lastActivity,
        session2Value: session2.lastActivity,
        resolution: 'investigate',
      });
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Attempt to repair corrupted session data
   */
  repairSession(sessionDto: SessionStateDto): {
    success: boolean;
    repaired?: SessionStateDto;
    repairs: string[];
  } {
    const validation = this.validateSessionState(sessionDto);
    const repairs: string[] = [];

    if (validation.isValid) {
      return {
        success: true,
        repaired: sessionDto,
        repairs: ['No repairs needed'],
      };
    }

    // Start with the original data
    let repaired = { ...sessionDto };

    // Apply automatic repairs from validation
    if (validation.repaired) {
      repaired = { ...repaired, ...validation.repaired };
      repairs.push('Applied automatic repairs from validation');
    }

    // Fix critical errors if possible
    for (const error of validation.errors) {
      if (error.severity === 'critical') {
        switch (error.field) {
          case 'sessionKey':
            // Cannot repair invalid session key
            return {
              success: false,
              repairs: ['Cannot repair invalid session key'],
            };

          case 'createdAt':
          case 'lastActivity':
          case 'updatedAt':
            // Set to current time if timestamp is invalid
            const now = new Date();
            repaired = { ...repaired, [error.field]: now };
            repairs.push(`Reset ${error.field} to current time`);
            break;
        }
      }
    }

    // Validate the repaired data
    const revalidation = this.validateSessionState(repaired);

    return {
      success: revalidation.isValid,
      repaired: revalidation.isValid ? repaired : undefined,
      repairs,
    };
  }
}

/**
 * Conflict details between sessions
 */
export interface ConflictDetail {
  type: 'overlapping_issues' | 'workflow_divergence' | 'concurrent_activity';
  field: string;
  description: string;
  session1Value: unknown;
  session2Value: unknown;
  resolution: 'merge' | 'use_latest' | 'investigate';
}