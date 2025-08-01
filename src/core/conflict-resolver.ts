/**
 * Conflict resolution and safety mechanisms for multi-agent coordination
 * 
 * Provides file locking, workspace isolation, and conflict detection/resolution
 */

import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { createLogger } from '../utils/logger.js';

import type { 
  ResourceLock, 
  AgentExecutionContext, 
  GitStatusInfo
} from '../types/multi-agent.js';
import type { Result } from '../types/index.js';

/**
 * File conflict detection and resolution
 */
export interface FileConflict {
  /** File path relative to project root */
  file: string;
  
  /** Conflicting agents */
  agents: string[];
  
  /** Conflict type */
  type: 'write-write' | 'read-write' | 'delete-modify' | 'merge-conflict';
  
  /** File content hashes for comparison */
  contentHashes: Record<string, string>;
  
  /** Suggested resolution strategy */
  suggestedResolution: ConflictResolution;
  
  /** Conflict severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  /** Resolution type */
  type: 'manual' | 'auto-merge' | 'agent-priority' | 'last-writer-wins' | 'delegate';
  
  /** Agent to delegate resolution to */
  delegateAgent?: string;
  
  /** Merge strategy if auto-merge */
  mergeStrategy?: 'three-way' | 'ours' | 'theirs' | 'union';
  
  /** Additional parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Workspace isolation configuration
 */
export interface WorkspaceIsolation {
  /** Isolated file patterns per agent */
  agentFilePatterns: Record<string, string[]>;
  
  /** Shared files that require coordination */
  sharedFiles: string[];
  
  /** Protected files that require special handling */
  protectedFiles: string[];
  
  /** Temporary files that can be safely overwritten */
  temporaryFiles: string[];
}

/**
 * Conflict resolver and safety manager
 */
export class ConflictResolver extends EventEmitter {
  private readonly logger = createLogger('conflict-resolver');
  private resourceLocks = new Map<string, ResourceLock>();
  private fileWatchers = new Map<string, any>();
  private conflictQueue: FileConflict[] = [];
  private workspaceIsolation?: WorkspaceIsolation;

  constructor(isolation?: WorkspaceIsolation) {
    super();
    this.workspaceIsolation = isolation || undefined;
    this.setupEventHandlers();
  }

  /**
   * Acquire resource lock for a file
   */
  async acquireResourceLock(
    file: string, 
    agentId: string, 
    lockType: 'read' | 'write' | 'exclusive',
    reason?: string
  ): Promise<Result<ResourceLock>> {
    try {
      const normalizedFile = this.normalizeFilePath(file);
      const existingLock = this.resourceLocks.get(normalizedFile);

      // Check for conflicts
      if (existingLock && !this.canAcquireLock(existingLock, agentId, lockType)) {
        return {
          success: false,
          error: {
            name: 'ResourceLockConflict',
            message: `File ${file} is locked by agent ${existingLock.agentId} with ${existingLock.type} access`,
            code: 'RESOURCE_LOCK_CONFLICT',
            context: { 
              file: normalizedFile,
              existingLock: existingLock,
              requestedBy: agentId,
              requestedType: lockType
            }
          } as any
        };
      }

      // Create the lock
      const lock: ResourceLock = {
        resource: normalizedFile,
        type: lockType,
        agentId,
        acquiredAt: new Date(),
        ...(reason && { reason })
      };

      // Set expiration for non-exclusive locks
      if (lockType !== 'exclusive') {
        lock.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      }

      this.resourceLocks.set(normalizedFile, lock);

      // Set up file watching for conflict detection
      await this.watchFile(normalizedFile, agentId);

      this.logger.debug('Resource lock acquired', { 
        file: normalizedFile, 
        agentId, 
        lockType, 
        reason 
      });

      this.emit('lock-acquired', lock);
      return { success: true, data: lock };

    } catch (error) {
      this.logger.error('Failed to acquire resource lock', { file, agentId, error });
      return {
        success: false,
        error: {
          name: 'ResourceLockError',
          message: `Failed to acquire lock for ${file}: ${error instanceof Error ? error.message : String(error)}`,
          code: 'RESOURCE_LOCK_ERROR',
          context: { file, agentId, originalError: error }
        } as any
      };
    }
  }

  /**
   * Release resource lock
   */
  async releaseResourceLock(file: string, agentId: string): Promise<Result<void>> {
    try {
      const normalizedFile = this.normalizeFilePath(file);
      const lock = this.resourceLocks.get(normalizedFile);

      if (!lock) {
        return {
          success: false,
          error: {
            name: 'ResourceLockNotFound',
            message: `No lock found for file ${file}`,
            code: 'RESOURCE_LOCK_NOT_FOUND',
            context: { file: normalizedFile, agentId }
          } as any
        };
      }

      if (lock.agentId !== agentId) {
        return {
          success: false,
          error: {
            name: 'ResourceLockUnauthorized',
            message: `Agent ${agentId} cannot release lock held by ${lock.agentId}`,
            code: 'RESOURCE_LOCK_UNAUTHORIZED',
            context: { file: normalizedFile, agentId, lockHolder: lock.agentId }
          } as any
        };
      }

      // Remove lock and file watcher
      this.resourceLocks.delete(normalizedFile);
      await this.unwatchFile(normalizedFile);

      this.logger.debug('Resource lock released', { file: normalizedFile, agentId });
      this.emit('lock-released', lock);

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Failed to release resource lock', { file, agentId, error });
      return {
        success: false,
        error: {
          name: 'ResourceLockReleaseError',
          message: `Failed to release lock for ${file}: ${error instanceof Error ? error.message : String(error)}`,
          code: 'RESOURCE_LOCK_RELEASE_ERROR',
          context: { file, agentId, originalError: error }
        } as any
      };
    }
  }

  /**
   * Detect conflicts between agent workspaces
   */
  async detectConflicts(contexts: AgentExecutionContext[]): Promise<FileConflict[]> {
    const conflicts: FileConflict[] = [];
    const fileModifications = new Map<string, string[]>();

    // Collect file modifications from each agent
    for (const context of contexts) {
      const gitStatus = await this.getGitStatus(context.worktreePath);
      if (gitStatus.success) {
        const modifiedFiles = [
          ...gitStatus.data!.modified,
          ...gitStatus.data!.added,
          ...gitStatus.data!.deleted
        ];

        for (const file of modifiedFiles) {
          const agents = fileModifications.get(file) || [];
          agents.push(context.agentId);
          fileModifications.set(file, agents);
        }
      }
    }

    // Find files modified by multiple agents
    for (const [file, agents] of fileModifications.entries()) {
      if (agents.length > 1) {
        const conflict = await this.analyzeFileConflict(file, agents, contexts);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    this.logger.info('Conflict detection completed', { 
      conflictCount: conflicts.length,
      criticalConflicts: conflicts.filter(c => c.severity === 'critical').length
    });

    return conflicts;
  }

  /**
   * Resolve file conflicts using configured strategy
   */
  async resolveConflict(conflict: FileConflict): Promise<Result<void>> {
    try {
      this.logger.info('Resolving conflict', { 
        file: conflict.file, 
        type: conflict.type,
        agents: conflict.agents,
        resolution: conflict.suggestedResolution.type
      });

      switch (conflict.suggestedResolution.type) {
        case 'manual':
          return await this.resolveManually(conflict);
        
        case 'auto-merge':
          return await this.resolveAutoMerge(conflict);
        
        case 'agent-priority':
          return await this.resolveByAgentPriority(conflict);
        
        case 'last-writer-wins':
          return await this.resolveLastWriterWins(conflict);
        
        case 'delegate':
          return await this.resolveDelegated(conflict);
        
        default:
          throw new Error(`Unknown resolution type: ${conflict.suggestedResolution.type}`);
      }

    } catch (error) {
      this.logger.error('Failed to resolve conflict', { conflict, error });
      return {
        success: false,
        error: {
          name: 'ConflictResolutionError',
          message: `Failed to resolve conflict for ${conflict.file}: ${error instanceof Error ? error.message : String(error)}`,
          code: 'CONFLICT_RESOLUTION_ERROR',
          context: { conflict, originalError: error }
        } as any
      };
    }
  }

  /**
   * Validate workspace isolation rules
   */
  async validateWorkspaceIsolation(context: AgentExecutionContext): Promise<Result<void>> {
    if (!this.workspaceIsolation) {
      return { success: true, data: undefined };
    }

    try {
      const agentPatterns = this.workspaceIsolation.agentFilePatterns[context.agentId] || [];
      const gitStatus = await this.getGitStatus(context.worktreePath);
      
      if (!gitStatus.success) {
        return gitStatus;
      }

      const modifiedFiles = [
        ...gitStatus.data!.modified,
        ...gitStatus.data!.added
      ];

      // Check if agent is modifying files outside their allowed patterns
      const violations: string[] = [];
      for (const file of modifiedFiles) {
        if (!this.isFileAllowedForAgent(file, agentPatterns)) {
          violations.push(file);
        }
      }

      if (violations.length > 0) {
        return {
          success: false,
          error: {
            name: 'WorkspaceIsolationViolation',
            message: `Agent ${context.agentId} is modifying files outside allowed patterns: ${violations.join(', ')}`,
            code: 'WORKSPACE_ISOLATION_VIOLATION',
            context: { agentId: context.agentId, violations, allowedPatterns: agentPatterns }
          } as any
        };
      }

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Failed to validate workspace isolation', { agentId: context.agentId, error });
      return {
        success: false,
        error: {
          name: 'WorkspaceValidationError',
          message: `Failed to validate workspace isolation: ${error instanceof Error ? error.message : String(error)}`,
          code: 'WORKSPACE_VALIDATION_ERROR',
          context: { agentId: context.agentId, originalError: error }
        } as any
      };
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    const expiredLocks: string[] = [];

    for (const [file, lock] of this.resourceLocks.entries()) {
      if (lock.expiresAt && lock.expiresAt < now) {
        expiredLocks.push(file);
      }
    }

    for (const file of expiredLocks) {
      const lock = this.resourceLocks.get(file);
      if (lock) {
        this.resourceLocks.delete(file);
        await this.unwatchFile(file);
        this.logger.debug('Expired lock cleaned up', { file, agentId: lock.agentId });
        this.emit('lock-expired', lock);
      }
    }

    if (expiredLocks.length > 0) {
      this.logger.info('Cleaned up expired locks', { count: expiredLocks.length });
    }
  }

  /**
   * Normalize file path for consistent lock management
   */
  private normalizeFilePath(file: string): string {
    return resolve(file).replace(/\\/g, '/');
  }

  /**
   * Check if a lock can be acquired given existing lock
   */
  private canAcquireLock(existingLock: ResourceLock, agentId: string, lockType: 'read' | 'write' | 'exclusive'): boolean {
    // Same agent can upgrade locks
    if (existingLock.agentId === agentId) {
      return true;
    }

    // Exclusive locks cannot coexist
    if (existingLock.type === 'exclusive' || lockType === 'exclusive') {
      return false;
    }

    // Write locks cannot coexist with anything
    if (existingLock.type === 'write' || lockType === 'write') {
      return false;
    }

    // Multiple read locks are allowed
    return existingLock.type === 'read' && lockType === 'read';
  }

  /**
   * Set up file watching for conflict detection
   */
  private async watchFile(file: string, agentId: string): Promise<void> {
    if (this.fileWatchers.has(file)) {
      return; // Already watching
    }

    try {
      // Simplified file watching - would need proper implementation
      const watcher = { close: () => {} }; // Mock watcher
      this.fileWatchers.set(file, watcher);
    } catch (error) {
      // File might not exist yet, that's ok
      this.logger.debug('Could not watch file', { file, error });
    }
  }

  /**
   * Remove file watcher
   */
  private async unwatchFile(file: string): Promise<void> {
    const watcher = this.fileWatchers.get(file);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(file);
    }
  }

  /**
   * Get git status for a worktree
   */
  private async getGitStatus(worktreePath: string): Promise<Result<GitStatusInfo>> {
    try {
      // This would use git commands to get status
      // For now, return a mock status
      const gitStatus: GitStatusInfo = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        staged: [],
        conflicts: []
      };

      return { success: true, data: gitStatus };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'GitStatusError',
          message: `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
          code: 'GIT_STATUS_ERROR',
          context: { worktreePath, originalError: error }
        } as any
      };
    }
  }

  /**
   * Analyze file conflict between agents
   */
  private async analyzeFileConflict(
    file: string, 
    agents: string[], 
    contexts: AgentExecutionContext[]
  ): Promise<FileConflict | null> {
    try {
      // Get file content hashes from each agent's worktree
      const contentHashes: Record<string, string> = {};
      
      for (const agentId of agents) {
        const context = contexts.find(c => c.agentId === agentId);
        if (context) {
          const filePath = join(context.worktreePath, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            contentHashes[agentId] = createHash('sha256').update(content).digest('hex');
          } catch (error) {
            // File might be deleted
            contentHashes[agentId] = 'deleted';
          }
        }
      }

      // Determine conflict type and severity
      const { type, severity } = this.classifyConflict(file, agents, contentHashes);
      
      // Suggest resolution strategy
      const suggestedResolution = this.suggestResolution(type, severity, agents);

      const conflict: FileConflict = {
        file,
        agents,
        type,
        contentHashes,
        suggestedResolution,
        severity
      };

      return conflict;

    } catch (error) {
      this.logger.error('Failed to analyze file conflict', { file, agents, error });
      return null;
    }
  }

  /**
   * Classify conflict type and severity
   */
  private classifyConflict(
    file: string, 
    _agents: string[], 
    contentHashes: Record<string, string>
  ): { type: FileConflict['type'], severity: FileConflict['severity'] } {
    const hashValues = Object.values(contentHashes);
    const uniqueHashes = new Set(hashValues);

    // Determine severity based on file importance
    let severity: FileConflict['severity'] = 'medium';
    if (this.workspaceIsolation?.protectedFiles.some(pattern => file.match(pattern))) {
      severity = 'critical';
    } else if (this.workspaceIsolation?.temporaryFiles.some(pattern => file.match(pattern))) {
      severity = 'low';
    } else if (hashValues.includes('deleted')) {
      severity = 'high';
    }

    // Determine conflict type
    let type: FileConflict['type'] = 'write-write';
    if (hashValues.includes('deleted')) {
      type = 'delete-modify';
    } else if (uniqueHashes.size > 2) {
      type = 'merge-conflict';
    }

    return { type, severity };
  }

  /**
   * Suggest resolution strategy based on conflict characteristics
   */
  private suggestResolution(
    type: FileConflict['type'], 
    severity: FileConflict['severity'], 
    agents: string[]
  ): ConflictResolution {
    // Critical conflicts require manual resolution
    if (severity === 'critical') {
      return { 
        type: 'manual',
        delegateAgent: 'code-reviewer'
      };
    }

    // Simple conflicts can be auto-resolved
    if (severity === 'low' && type === 'write-write') {
      return { 
        type: 'last-writer-wins'
      };
    }

    // Delegate complex conflicts to appropriate agent
    if (type === 'merge-conflict') {
      return {
        type: 'delegate',
        delegateAgent: agents.includes('code-reviewer') ? 'code-reviewer' : 'tech-lead'
      };
    }

    // Default to agent priority
    return {
      type: 'agent-priority'
    };
  }

  /**
   * Check if file is allowed for agent based on patterns
   */
  private isFileAllowedForAgent(file: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return true; // No restrictions
    }

    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(file);
    });
  }

  /**
   * Resolution implementations
   */
  private async resolveManually(conflict: FileConflict): Promise<Result<void>> {
    this.logger.info('Manual resolution required', { file: conflict.file });
    this.emit('manual-resolution-required', conflict);
    return { success: true, data: undefined };
  }

  private async resolveAutoMerge(conflict: FileConflict): Promise<Result<void>> {
    this.logger.info('Auto-merge resolution', { file: conflict.file });
    // Implementation would handle git merge
    return { success: true, data: undefined };
  }

  private async resolveByAgentPriority(conflict: FileConflict): Promise<Result<void>> {
    const agentPriority = ['software-architect', 'tech-lead', 'developer', 'qa', 'code-reviewer', 'product-manager'];
    const winner = conflict.agents.sort((a, b) => 
      agentPriority.indexOf(a) - agentPriority.indexOf(b)
    )[0];
    
    this.logger.info('Agent priority resolution', { file: conflict.file, winner });
    return { success: true, data: undefined };
  }

  private async resolveLastWriterWins(conflict: FileConflict): Promise<Result<void>> {
    this.logger.info('Last writer wins resolution', { file: conflict.file });
    return { success: true, data: undefined };
  }

  private async resolveDelegated(conflict: FileConflict): Promise<Result<void>> {
    const delegate = conflict.suggestedResolution.delegateAgent;
    this.logger.info('Delegated resolution', { file: conflict.file, delegate });
    this.emit('resolution-delegated', { conflict, delegate });
    return { success: true, data: undefined };
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.on('lock-acquired', (lock: ResourceLock) => {
      this.logger.debug('Lock acquired event', { resource: lock.resource, agent: lock.agentId });
    });

    this.on('lock-released', (lock: ResourceLock) => {
      this.logger.debug('Lock released event', { resource: lock.resource, agent: lock.agentId });
    });

    this.on('file-changed', (event: { file: string, agentId: string, timestamp: Date }) => {
      this.logger.debug('File changed event', event);
    });
  }

  /**
   * Get current resource locks
   */
  getResourceLocks(): Map<string, ResourceLock> {
    return new Map(this.resourceLocks);
  }

  /**
   * Get conflicts in queue
   */
  getConflictQueue(): FileConflict[] {
    return [...this.conflictQueue];
  }
}