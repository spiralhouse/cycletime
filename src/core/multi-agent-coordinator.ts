/**
 * Multi-agent coordination service for JCVD framework
 * 
 * Manages parallel execution of multiple Claude Code agents across separate git branches
 */

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import { createLogger } from '../utils/logger.js';

import type { 
  MultiAgentContext, 
  AgentExecutionContext, 
  AgentTask, 
  WorktreeInfo, 
  ResourceLock, 
  AgentMessage, 
  CoordinationStrategy,
  MultiAgentMetrics,
  AgentError
} from '../types/multi-agent.js';
import type { TaskCoordinationConfig } from '../types/config.js';
import type { Result } from '../types/index.js';

/**
 * Multi-agent coordinator manages parallel execution of Claude Code agents
 */
export class MultiAgentCoordinator extends EventEmitter {
  private readonly logger = createLogger('multi-agent-coordinator');
  private contexts = new Map<string, MultiAgentContext>();
  private resourceLocks = new Map<string, ResourceLock>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private messageQueue: AgentMessage[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private metrics = new Map<string, MultiAgentMetrics>();

  constructor(private config: TaskCoordinationConfig) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Start a multi-agent execution for a set of tasks
   */
  async startMultiAgentExecution(
    taskId: string,
    tasks: AgentTask[],
    strategy: CoordinationStrategy
  ): Promise<Result<MultiAgentContext>> {
    try {
      this.logger.info('Starting multi-agent execution', { taskId, taskCount: tasks.length });

      // Create execution context
      const context: MultiAgentContext = {
        taskId,
        agents: [],
        sharedContext: {},
        worktrees: [],
        status: 'initializing',
        startTime: new Date(),
        errors: []
      };

      // Analyze task dependencies and create execution plan
      const executionPlan = await this.createExecutionPlan(tasks, strategy);
      
      // Assign agents to tasks
      const agentAssignments = await this.assignAgentsToTasks(executionPlan);
      
      // Set up git worktrees for each agent
      for (const assignment of agentAssignments) {
        const worktree = await this.createWorktree(assignment.agentId, taskId);
        if (!worktree.success) {
          return { success: false, error: worktree.error };
        }
        
        const agentContext: AgentExecutionContext = {
          agentId: assignment.agentId,
          agentType: assignment.agentType,
          tasks: assignment.tasks,
          branch: worktree.data!.branch,
          worktreePath: worktree.data!.path,
          status: 'initializing',
          resourceLocks: [],
          communicationChannel: `agent-${assignment.agentId}-${taskId}`
        };
        
        context.agents.push(agentContext);
        context.worktrees.push(worktree.data!);
      }

      // Store context
      this.contexts.set(taskId, context);

      // Start agent execution
      context.status = 'running';
      await this.startAgentExecution(context, strategy);

      this.emit('multi-agent-started', context);
      return { success: true, data: context };

    } catch (error) {
      this.logger.error('Failed to start multi-agent execution', { taskId, error });
      return {
        success: false,
        error: {
          name: 'MultiAgentStartError',
          message: `Failed to start multi-agent execution: ${error instanceof Error ? error.message : String(error)}`,
          code: 'MULTI_AGENT_START_ERROR',
          context: { taskId, originalError: error }
        } as any
      };
    }
  }

  /**
   * Create git worktree for an agent
   */
  private async createWorktree(agentId: string, taskId: string): Promise<Result<WorktreeInfo>> {
    try {
      if (!this.config.parallel?.worktree) {
        throw new Error('Worktree configuration not found');
      }

      const worktreeConfig = this.config.parallel.worktree;
      const timestamp = Date.now();
      const branchName = `feature/agent/${agentId}/${taskId}-${timestamp}`;
      const worktreePath = join(worktreeConfig.baseDir, `agent-${agentId}-${timestamp}`);

      this.logger.debug('Creating worktree', { agentId, branchName, worktreePath });

      // Ensure base directory exists
      await fs.mkdir(worktreeConfig.baseDir, { recursive: true });

      // Create git worktree
      await this.executeGitCommand(['worktree', 'add', '-b', branchName, worktreePath]);

      // Sync shared files if configured
      if (worktreeConfig.syncSharedFiles?.length) {
        await this.syncSharedFiles(worktreePath, worktreeConfig.syncSharedFiles);
      }

      const worktreeInfo: WorktreeInfo = {
        path: worktreePath,
        branch: branchName,
        agent: agentId,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      };

      this.logger.debug('Worktree created successfully', { agentId, worktreePath });
      return { success: true, data: worktreeInfo };

    } catch (error) {
      this.logger.error('Failed to create worktree', { agentId, error });
      return {
        success: false,
        error: {
          name: 'WorktreeCreationError',
          message: `Failed to create worktree for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
          code: 'WORKTREE_CREATION_ERROR',
          context: { agentId, originalError: error }
        } as any
      };
    }
  }

  /**
   * Execute git command
   */
  private async executeGitCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, { 
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Git command failed: ${stderr}`));
        }
      });
    });
  }

  /**
   * Sync shared files to worktree
   */
  private async syncSharedFiles(worktreePath: string, sharedFiles: string[]): Promise<void> {
    for (const file of sharedFiles) {
      try {
        const sourcePath = resolve(file);
        const targetPath = join(worktreePath, file);
        
        // Ensure target directory exists
        await fs.mkdir(join(targetPath, '..'), { recursive: true });
        
        // Copy file
        await fs.copyFile(sourcePath, targetPath);
        
        this.logger.debug('Synced shared file', { file, worktreePath });
      } catch (error) {
        this.logger.warn('Failed to sync shared file', { file, worktreePath, error });
        // Continue with other files
      }
    }
  }

  /**
   * Create execution plan from tasks
   */
  private async createExecutionPlan(tasks: AgentTask[], strategy: CoordinationStrategy): Promise<AgentTask[]> {
    // Sort tasks based on strategy
    let sortedTasks = [...tasks];
    
    switch (strategy.taskScheduling) {
      case 'priority':
        sortedTasks.sort((a, b) => b.priority - a.priority);
        break;
      case 'shortest-first':
        sortedTasks.sort((a, b) => (a.estimatedDuration || 0) - (b.estimatedDuration || 0));
        break;
      case 'dependency-first':
        sortedTasks = await this.sortByDependencies(sortedTasks);
        break;
      case 'fifo':
      default:
        // Keep original order
        break;
    }

    this.logger.debug('Created execution plan', { 
      taskCount: sortedTasks.length, 
      strategy: strategy.taskScheduling 
    });

    return sortedTasks;
  }

  /**
   * Sort tasks by dependencies (topological sort)
   */
  private async sortByDependencies(tasks: AgentTask[]): Promise<AgentTask[]> {
    const sorted: AgentTask[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const visit = (taskId: string) => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }
      if (visited.has(taskId)) {
        return;
      }

      const task = taskMap.get(taskId);
      if (!task) {
        return;
      }

      visiting.add(taskId);
      
      // Visit dependencies first
      for (const depId of task.dependencies) {
        visit(depId);
      }
      
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
    };

    // Visit all tasks
    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }

  /**
   * Assign agents to tasks based on configuration
   */
  private async assignAgentsToTasks(tasks: AgentTask[]): Promise<AgentAssignment[]> {
    const assignments: AgentAssignment[] = [];
    const agentWorkload = new Map<string, number>();

    // Get available agents from configuration
    const availableAgents = this.getAvailableAgents();

    for (const task of tasks) {
      // Find best agent for this task
      const bestAgent = this.findBestAgentForTask(task, availableAgents, agentWorkload);
      
      let assignment = assignments.find(a => a.agentId === bestAgent.id);
      if (!assignment) {
        assignment = {
          agentId: bestAgent.id,
          agentType: bestAgent.type,
          tasks: []
        };
        assignments.push(assignment);
      }
      
      assignment.tasks.push(task);
      agentWorkload.set(bestAgent.id, (agentWorkload.get(bestAgent.id) || 0) + 1);
    }

    this.logger.debug('Created agent assignments', { 
      assignmentCount: assignments.length,
      assignments: assignments.map(a => ({ agent: a.agentId, taskCount: a.tasks.length }))
    });

    return assignments;
  }

  /**
   * Get available agents from configuration
   */
  private getAvailableAgents(): Array<{ id: string, type: string }> {
    const agents = [
      { id: 'developer', type: 'developer' },
      { id: 'qa', type: 'qa' },
      { id: 'code-reviewer', type: 'code-reviewer' },
      { id: 'tech-lead', type: 'tech-lead' },
      { id: 'software-architect', type: 'software-architect' },
      { id: 'product-manager', type: 'product-manager' }
    ];

    return agents.filter(agent => 
      this.config.preferences?.[agent.id]?.enabled !== false
    );
  }

  /**
   * Find best agent for a task
   */
  private findBestAgentForTask(
    task: AgentTask, 
    availableAgents: Array<{ id: string, type: string }>,
    workload: Map<string, number>
  ): { id: string, type: string } {
    // Check routing rules first
    if (this.config.routing) {
      for (const rule of this.config.routing.sort((a, b) => b.priority - a.priority)) {
        if (task.type.match(rule.taskType)) {
          const agent = availableAgents.find(a => a.id === rule.agent);
          if (agent) {
            return agent;
          }
        }
      }
    }

    // Fall back to load balancing
    if (availableAgents.length === 0) {
      throw new Error('No available agents for task assignment');
    }
    
    let bestAgent = availableAgents[0];
    let minWorkload = workload.get(bestAgent.id) || 0;

    for (const agent of availableAgents) {
      const agentWorkload = workload.get(agent.id) || 0;
      if (agentWorkload < minWorkload) {
        bestAgent = agent;
        minWorkload = agentWorkload;
      }
    }

    return bestAgent;
  }

  /**
   * Start execution for all agents
   */
  private async startAgentExecution(
    context: MultiAgentContext, 
    strategy: CoordinationStrategy
  ): Promise<void> {
    this.logger.info('Starting agent execution', { 
      taskId: context.taskId,
      agentCount: context.agents.length 
    });

    // Start each agent
    const agentPromises = context.agents.map(async (agent) => {
      try {
        agent.status = 'working';
        await this.executeAgentTasks(agent, strategy);
        agent.status = 'completed';
        this.logger.debug('Agent completed', { agentId: agent.agentId });
      } catch (error) {
        agent.status = 'failed';
        const agentError: AgentError = {
          id: `${agent.agentId}-${Date.now()}`,
          agentId: agent.agentId,
          type: 'task-error',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          resolved: false
        };
        context.errors = context.errors || [];
        context.errors.push(agentError);
        this.logger.error('Agent failed', { agentId: agent.agentId, error });
      }
    });

    // Wait for all agents to complete
    await Promise.allSettled(agentPromises);

    // Determine overall status
    const hasErrors = context.agents.some(a => a.status === 'failed');
    const allCompleted = context.agents.every(a => a.status === 'completed' || a.status === 'failed');

    if (allCompleted) {
      context.status = hasErrors ? 'failed' : 'completed';
      context.completionTime = new Date();
    }

    this.emit('multi-agent-completed', context);
  }

  /**
   * Execute tasks for a single agent
   */
  private async executeAgentTasks(
    agent: AgentExecutionContext, 
    _strategy: CoordinationStrategy
  ): Promise<void> {
    this.logger.debug('Executing agent tasks', { 
      agentId: agent.agentId, 
      taskCount: agent.tasks.length 
    });

    for (const task of agent.tasks) {
      // Acquire resource locks
      const lockResult = await this.acquireResourceLocks(agent, task);
      if (!lockResult.success) {
        throw new Error(`Failed to acquire resource locks: ${lockResult.error?.message}`);
      }

      try {
        // Execute task via Claude Code Task tool
        await this.executeTask(agent, task);
        this.logger.debug('Task completed', { agentId: agent.agentId, taskId: task.id });
      } finally {
        // Release resource locks
        await this.releaseResourceLocks(agent, task);
      }
    }
  }

  /**
   * Execute a single task using Claude Code Task tool
   */
  private async executeTask(agent: AgentExecutionContext, task: AgentTask): Promise<void> {
    // This would integrate with Claude Code's Task tool
    // For now, this is a placeholder that simulates task execution
    this.logger.debug('Executing task', { 
      agentId: agent.agentId, 
      taskId: task.id, 
      worktree: agent.worktreePath 
    });

    // Simulate task execution time
    const duration = task.estimatedDuration || 0;
    await new Promise(resolve => setTimeout(resolve, Math.min(duration * 1000, 5000)));

    // Update last activity
    const worktree = this.contexts.get(agent.agentId)?.worktrees.find(w => w.agent === agent.agentId);
    if (worktree) {
      worktree.lastActivity = new Date();
    }
  }

  /**
   * Acquire resource locks for a task
   */
  private async acquireResourceLocks(
    agent: AgentExecutionContext, 
    task: AgentTask
  ): Promise<Result<void>> {
    const locksToAcquire: ResourceLock[] = [];

    for (const file of task.affectedFiles) {
      // Check if resource is already locked
      const existingLock = this.resourceLocks.get(file);
      if (existingLock && existingLock.agentId !== agent.agentId) {
        return {
          success: false,
          error: {
            name: 'ResourceLockError',
            message: `Resource ${file} is locked by agent ${existingLock.agentId}`,
            code: 'RESOURCE_LOCKED',
            context: { resource: file, lockHolder: existingLock.agentId }
          } as any
        };
      }

      // Create lock
      const lock: ResourceLock = {
        resource: file,
        type: 'write',
        agentId: agent.agentId,
        acquiredAt: new Date(),
        reason: `Task ${task.id}`
      };

      locksToAcquire.push(lock);
    }

    // Acquire all locks
    for (const lock of locksToAcquire) {
      this.resourceLocks.set(lock.resource, lock);
      agent.resourceLocks.push(lock);
    }

    this.logger.debug('Acquired resource locks', { 
      agentId: agent.agentId, 
      taskId: task.id,
      lockCount: locksToAcquire.length 
    });

    return { success: true, data: undefined };
  }

  /**
   * Release resource locks for a task
   */
  private async releaseResourceLocks(
    agent: AgentExecutionContext, 
    task: AgentTask
  ): Promise<void> {
    for (const file of task.affectedFiles) {
      this.resourceLocks.delete(file);
      agent.resourceLocks = agent.resourceLocks.filter(lock => lock.resource !== file);
    }

    this.logger.debug('Released resource locks', { 
      agentId: agent.agentId, 
      taskId: task.id 
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.on('multi-agent-started', (context: MultiAgentContext) => {
      this.logger.info('Multi-agent execution started', { taskId: context.taskId });
    });

    this.on('multi-agent-completed', (context: MultiAgentContext) => {
      this.logger.info('Multi-agent execution completed', { 
        taskId: context.taskId,
        status: context.status,
        duration: context.completionTime ? 
          context.completionTime.getTime() - context.startTime.getTime() : 
          undefined
      });
    });
  }

  /**
   * Get execution context for a task
   */
  getContext(taskId: string): MultiAgentContext | undefined {
    return this.contexts.get(taskId);
  }

  /**
   * Clean up completed contexts and worktrees
   */
  async cleanup(taskId?: string): Promise<void> {
    const contextsToClean = taskId ? 
      [this.contexts.get(taskId)].filter(Boolean) : 
      Array.from(this.contexts.values()).filter(c => c.status === 'completed' || c.status === 'failed');

    for (const context of contextsToClean) {
      if (!context) continue;

      // Clean up worktrees
      for (const worktree of context.worktrees) {
        try {
          await this.executeGitCommand(['worktree', 'remove', worktree.path, '--force']);
          this.logger.debug('Cleaned up worktree', { path: worktree.path });
        } catch (error) {
          this.logger.warn('Failed to clean up worktree', { path: worktree.path, error });
        }
      }

      // Remove context
      this.contexts.delete(context.taskId);
    }
  }
}

/**
 * Agent assignment for task execution
 */
interface AgentAssignment {
  agentId: string;
  agentType: string;
  tasks: AgentTask[];
}