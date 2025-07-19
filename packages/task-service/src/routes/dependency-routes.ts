import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { AddDependencyRequest, AddDependencySchema } from '../types/task-types';
import { getCurrentUserId } from '../middleware/auth-middleware';
import { DependencyAnalysisResponse, DependencyValidationRequest, DependencyValidationResponse } from '../types/service-types';

export async function dependencyRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task dependencies
  fastify.get('/:taskId/dependencies', {
    schema: {
      description: 'Get dependencies for a task',
      tags: ['Dependencies'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const dependencies = await fastify.taskService.getDependencies(taskId);
    return reply.code(200).send(dependencies);
  });

  // Add task dependency
  fastify.post('/:taskId/dependencies', {
    schema: {
      description: 'Add a dependency between tasks',
      tags: ['Dependencies'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        type: Type.String({ enum: ['blocks', 'depends_on', 'subtask', 'parent'] }),
        targetTaskId: Type.String({ format: 'uuid' }),
        comment: Type.Optional(Type.String())
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: AddDependencyRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const addRequest = AddDependencySchema.parse(request.body);

    const dependency = await fastify.taskService.addDependency(taskId, addRequest, userId);
    return reply.code(201).send(dependency);
  });

  // Remove task dependency
  fastify.delete('/:taskId/dependencies/:dependencyId', {
    schema: {
      description: 'Remove a dependency between tasks',
      tags: ['Dependencies'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' }),
        dependencyId: Type.String({ format: 'uuid' })
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string; dependencyId: string } }>, reply: FastifyReply) => {
    const { taskId, dependencyId } = request.params;
    const success = await fastify.taskService.removeDependency(taskId, dependencyId);
    return reply.code(success ? 204 : 404).send();
  });

  // Analyze dependencies across tasks
  fastify.get('/dependencies/analyze', {
    schema: {
      description: 'Analyze dependencies across tasks using AI-powered insights',
      tags: ['Dependencies'],
      querystring: Type.Object({
        projectId: Type.Optional(Type.String({ format: 'uuid' })),
        taskIds: Type.Optional(Type.String()),
        includeCircular: Type.Optional(Type.Boolean({ default: true })),
        includeCriticalPath: Type.Optional(Type.Boolean({ default: true })),
        includeBottlenecks: Type.Optional(Type.Boolean({ default: true })),
        includeRecommendations: Type.Optional(Type.Boolean({ default: true }))
      }),
      response: {
        200: Type.Object({
          analysis: Type.Object({
            totalDependencies: Type.Number(),
            circularDependencies: Type.Array(Type.Object({
              cycle: Type.Array(Type.String()),
              severity: Type.String({ enum: ['low', 'medium', 'high', 'critical'] }),
              description: Type.String()
            })),
            criticalPath: Type.Array(Type.String()),
            bottlenecks: Type.Array(Type.Object({
              taskId: Type.String(),
              dependentCount: Type.Number(),
              impact: Type.String({ enum: ['low', 'medium', 'high', 'critical'] }),
              description: Type.String()
            })),
            risks: Type.Array(Type.Object({
              type: Type.String({ enum: ['circular', 'bottleneck', 'external', 'timing', 'resource'] }),
              severity: Type.String({ enum: ['low', 'medium', 'high', 'critical'] }),
              affectedTasks: Type.Array(Type.String()),
              description: Type.String()
            }))
          }),
          recommendations: Type.Array(Type.Object({
            type: Type.String({ enum: ['optimization', 'restructure', 'parallel', 'buffer'] }),
            priority: Type.String({ enum: ['low', 'medium', 'high', 'urgent'] }),
            description: Type.String(),
            affectedTasks: Type.Array(Type.String()),
            estimatedImpact: Type.String({ enum: ['low', 'medium', 'high'] })
          })),
          metadata: Type.Object({
            analyzedAt: Type.String(),
            version: Type.String(),
            confidence: Type.Number()
          })
        })
      }
    }
  }, async (request: FastifyRequest<{ 
    Querystring: { 
      projectId?: string; 
      taskIds?: string; 
      includeCircular?: boolean;
      includeCriticalPath?: boolean;
      includeBottlenecks?: boolean;
      includeRecommendations?: boolean;
    } 
  }>, reply: FastifyReply) => {
    const { projectId, taskIds, includeCircular = true, includeCriticalPath = true, includeBottlenecks = true, includeRecommendations = true } = request.query;
    
    try {
      // Parse taskIds if provided
      const taskIdArray = taskIds ? taskIds.split(',').map(id => id.trim()) : undefined;
      
      // Generate realistic mock dependency analysis using mock data service
      const mockDataService = fastify.mockDataService;
      const analysisResponse: DependencyAnalysisResponse = {
        analysis: {
          totalDependencies: Math.floor(Math.random() * 25) + 15,
          circularDependencies: includeCircular ? [
            {
              cycle: ['task-001', 'task-005', 'task-012', 'task-001'],
              severity: 'medium',
              description: 'Circular dependency detected in authentication flow where task A blocks task B, task B blocks task C, and task C blocks task A'
            },
            {
              cycle: ['task-018', 'task-022', 'task-018'],
              severity: 'high',
              description: 'Critical circular dependency in database migration affecting deployment timeline'
            }
          ] : [],
          criticalPath: includeCriticalPath ? [
            'task-001', 'task-003', 'task-007', 'task-012', 'task-015', 'task-020'
          ] : [],
          bottlenecks: includeBottlenecks ? [
            {
              taskId: 'task-007',
              dependentCount: 8,
              impact: 'critical',
              description: 'Database schema migration task blocks 8 dependent tasks across multiple features'
            },
            {
              taskId: 'task-012',
              dependentCount: 5,
              impact: 'high',
              description: 'Authentication service implementation blocks 5 frontend components'
            },
            {
              taskId: 'task-003',
              dependentCount: 3,
              impact: 'medium',
              description: 'API design approval task creates bottleneck for 3 implementation tasks'
            }
          ] : [],
          risks: [
            {
              type: 'circular',
              severity: 'high',
              affectedTasks: ['task-001', 'task-005', 'task-012'],
              description: 'Circular dependencies may cause deadlocks and prevent task completion'
            },
            {
              type: 'bottleneck',
              severity: 'critical',
              affectedTasks: ['task-007', 'task-008', 'task-009', 'task-010', 'task-011', 'task-013', 'task-014', 'task-016'],
              description: 'Single point of failure in database migration could delay entire project by 2-3 weeks'
            },
            {
              type: 'resource',
              severity: 'medium',
              affectedTasks: ['task-003', 'task-007', 'task-015'],
              description: 'Multiple critical tasks assigned to same senior developer creating resource conflict'
            },
            {
              type: 'external',
              severity: 'medium',
              affectedTasks: ['task-020', 'task-021'],
              description: 'External API approval dependency introduces uncertainty in timeline'
            }
          ]
        },
        recommendations: includeRecommendations ? [
          {
            type: 'restructure',
            priority: 'urgent',
            description: 'Break circular dependency by redefining task-005 to not depend on task-012',
            affectedTasks: ['task-001', 'task-005', 'task-012'],
            estimatedImpact: 'high'
          },
          {
            type: 'parallel',
            priority: 'high',
            description: 'Parallelize database schema changes to reduce bottleneck impact',
            affectedTasks: ['task-007', 'task-008', 'task-009'],
            estimatedImpact: 'high'
          },
          {
            type: 'buffer',
            priority: 'medium',
            description: 'Add 20% time buffer to critical path tasks to accommodate delays',
            affectedTasks: ['task-001', 'task-003', 'task-007', 'task-012', 'task-015', 'task-020'],
            estimatedImpact: 'medium'
          },
          {
            type: 'optimization',
            priority: 'medium',
            description: 'Consider alternative authentication approach to reduce dependency complexity',
            affectedTasks: ['task-012', 'task-013', 'task-014', 'task-015'],
            estimatedImpact: 'medium'
          }
        ] : [],
        metadata: {
          analyzedAt: new Date().toISOString(),
          version: '1.0.0',
          confidence: 0.85
        }
      };

      return reply.code(200).send(analysisResponse);
    } catch (error) {
      fastify.log.error('Error analyzing dependencies:', error);
      return reply.code(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to analyze task dependencies' 
      });
    }
  });

  // Validate dependencies for conflicts
  fastify.post('/dependencies/validate', {
    schema: {
      description: 'Validate task dependencies for conflicts and provide suggestions',
      tags: ['Dependencies'],
      body: Type.Object({
        dependencies: Type.Array(Type.Object({
          sourceTaskId: Type.String({ format: 'uuid' }),
          targetTaskId: Type.String({ format: 'uuid' }),
          type: Type.String({ enum: ['blocks', 'depends_on', 'subtask'] }),
          description: Type.Optional(Type.String())
        })),
        context: Type.Optional(Type.Object({
          projectId: Type.Optional(Type.String({ format: 'uuid' })),
          validateCycles: Type.Optional(Type.Boolean({ default: true })),
          validateCapacity: Type.Optional(Type.Boolean({ default: true })),
          validateTiming: Type.Optional(Type.Boolean({ default: true }))
        }))
      }),
      response: {
        200: Type.Object({
          isValid: Type.Boolean(),
          validation: Type.Object({
            cycleCheck: Type.Object({
              passed: Type.Boolean(),
              cycles: Type.Array(Type.Object({
                cycle: Type.Array(Type.String()),
                severity: Type.String({ enum: ['warning', 'error', 'critical'] })
              }))
            }),
            capacityCheck: Type.Object({
              passed: Type.Boolean(),
              conflicts: Type.Array(Type.Object({
                taskId: Type.String(),
                issue: Type.String(),
                severity: Type.String({ enum: ['warning', 'error', 'critical'] })
              }))
            }),
            timingCheck: Type.Object({
              passed: Type.Boolean(),
              conflicts: Type.Array(Type.Object({
                sourceTaskId: Type.String(),
                targetTaskId: Type.String(),
                issue: Type.String(),
                severity: Type.String({ enum: ['warning', 'error', 'critical'] })
              }))
            })
          }),
          suggestions: Type.Array(Type.Object({
            type: Type.String({ enum: ['remove', 'modify', 'reorder', 'split'] }),
            description: Type.String(),
            affectedDependencies: Type.Array(Type.Number())
          })),
          metadata: Type.Object({
            validatedAt: Type.String(),
            version: Type.String()
          })
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: DependencyValidationRequest }>, reply: FastifyReply) => {
    const { dependencies, context = {} } = request.body;
    const { validateCycles = true, validateCapacity = true, validateTiming = true } = context;

    try {
      // Validate request
      if (!dependencies || dependencies.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Dependencies array is required and cannot be empty'
        });
      }

      // Check for duplicate dependencies
      const dependencyKeys = new Set();
      const duplicates = dependencies.filter(dep => {
        const key = `${dep.sourceTaskId}->${dep.targetTaskId}`;
        if (dependencyKeys.has(key)) {
          return true;
        }
        dependencyKeys.add(key);
        return false;
      });

      if (duplicates.length > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Duplicate dependencies detected in request'
        });
      }

      // Generate realistic mock validation response
      const mockDataService = fastify.mockDataService;
      const hasCircularDependency = validateCycles && Math.random() < 0.3; // 30% chance of circular dependency
      const hasCapacityConflicts = validateCapacity && Math.random() < 0.4; // 40% chance of capacity conflicts
      const hasTimingConflicts = validateTiming && Math.random() < 0.25; // 25% chance of timing conflicts

      const isValid = !hasCircularDependency && !hasCapacityConflicts && !hasTimingConflicts;
      
      const validationResponse: DependencyValidationResponse = {
        isValid,
        validation: {
          cycleCheck: {
            passed: !hasCircularDependency,
            cycles: hasCircularDependency ? [
              {
                cycle: [dependencies[0].sourceTaskId, dependencies[1]?.sourceTaskId || dependencies[0].targetTaskId, dependencies[0].sourceTaskId],
                severity: 'error'
              }
            ] : []
          },
          capacityCheck: {
            passed: !hasCapacityConflicts,
            conflicts: hasCapacityConflicts ? [
              {
                taskId: dependencies[0].sourceTaskId,
                issue: 'Task assignee has capacity conflicts with 3 other concurrent tasks',
                severity: 'warning'
              },
              {
                taskId: dependencies[1]?.sourceTaskId || dependencies[0].targetTaskId,
                issue: 'Resource over-allocation detected for critical skill set',
                severity: 'error'
              }
            ] : []
          },
          timingCheck: {
            passed: !hasTimingConflicts,
            conflicts: hasTimingConflicts ? [
              {
                sourceTaskId: dependencies[0].sourceTaskId,
                targetTaskId: dependencies[0].targetTaskId,
                issue: 'Target task scheduled to start before source task completion',
                severity: 'error'
              }
            ] : []
          }
        },
        suggestions: !isValid ? [
          {
            type: 'reorder',
            description: 'Adjust task scheduling to resolve timing conflicts',
            affectedDependencies: [0, 1]
          },
          {
            type: 'modify',
            description: 'Consider splitting complex tasks to reduce resource contention',
            affectedDependencies: [0]
          },
          {
            type: 'remove',
            description: 'Remove unnecessary dependencies to break circular references',
            affectedDependencies: hasCircularDependency ? [0] : []
          }
        ] : [
          {
            type: 'split',
            description: 'Consider breaking down large tasks for better parallelization',
            affectedDependencies: []
          }
        ],
        metadata: {
          validatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      return reply.code(200).send(validationResponse);
    } catch (error) {
      fastify.log.error('Error validating dependencies:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate task dependencies'
      });
    }
  });
}