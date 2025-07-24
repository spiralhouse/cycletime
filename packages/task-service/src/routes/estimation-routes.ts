import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { randomUUID } from 'crypto';
import { 
  TaskEstimationRequest, 
  TaskEstimationResponse, 
  UpdateTaskEstimateRequest, 
  BatchEstimationRequest, 
  BatchEstimationResponse 
} from '../types/service-types';
import { getCurrentUserId } from '../middleware/auth-middleware';
import { measureAsyncDuration } from '../middleware/request-logger';
import { logger } from '@cycletime/shared-utils';

/**
 * AI-powered estimation route handlers for the Task Service
 * Provides sophisticated estimation capabilities with multiple methodologies
 */
export async function estimationRoutes(fastify: FastifyInstance): Promise<void> {
  
  /**
   * POST /tasks/estimate - AI-assisted effort estimation
   * Provides comprehensive task estimation using multiple methodologies
   */
  fastify.post('/estimate', {
    schema: {
      tags: ['AI Estimation'],
      body: Type.Object({
        tasks: Type.Array(Type.Object({
          id: Type.Optional(Type.String({ format: 'uuid' })),
          title: Type.String({ minLength: 1, maxLength: 255 }),
          description: Type.String({ minLength: 1 }),
          type: Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] }),
          requirements: Type.Optional(Type.Array(Type.String())),
          complexity: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'very_high'] }))
        })),
        context: Type.Optional(Type.Object({
          teamExperience: Type.String({ enum: ['junior', 'intermediate', 'senior', 'expert'] }),
          techStack: Type.Optional(Type.Array(Type.String())),
          projectType: Type.String({ enum: ['greenfield', 'brownfield', 'maintenance', 'migration'] }),
          constraints: Type.Optional(Type.Array(Type.String()))
        })),
        options: Type.Optional(Type.Object({
          unit: Type.String({ enum: ['hours', 'story_points', 'days'], default: 'hours' }),
          includeBuffer: Type.Boolean({ default: true }),
          bufferPercentage: Type.Number({ minimum: 0, maximum: 100, default: 20 }),
          includeBreakdown: Type.Boolean({ default: true }),
          confidenceLevel: Type.String({ enum: ['low', 'medium', 'high'], default: 'medium' })
        }))
      }),
      response: {
        200: Type.Object({
          estimations: Type.Array(Type.Object({
            taskId: Type.Optional(Type.String({ format: 'uuid' })),
            estimate: Type.Object({
              hours: Type.Number({ minimum: 0 }),
              storyPoints: Type.Number({ minimum: 0 }),
              confidence: Type.Number({ minimum: 0, maximum: 100 }),
              range: Type.Object({
                min: Type.Number({ minimum: 0 }),
                max: Type.Number({ minimum: 0 }),
                mostLikely: Type.Number({ minimum: 0 })
              }),
              breakdown: Type.Object({
                analysis: Type.Number({ minimum: 0 }),
                design: Type.Number({ minimum: 0 }),
                implementation: Type.Number({ minimum: 0 }),
                testing: Type.Number({ minimum: 0 }),
                review: Type.Number({ minimum: 0 }),
                deployment: Type.Number({ minimum: 0 }),
                buffer: Type.Number({ minimum: 0 })
              }),
              factors: Type.Array(Type.Object({
                factor: Type.String(),
                impact: Type.String({ enum: ['decreases', 'neutral', 'increases'] }),
                multiplier: Type.Number({ minimum: 0 }),
                description: Type.String()
              })),
              comparisons: Type.Array(Type.Object({
                taskId: Type.String({ format: 'uuid' }),
                title: Type.String(),
                similarity: Type.Number({ minimum: 0, maximum: 100 }),
                actualHours: Type.Number({ minimum: 0 }),
                variance: Type.Number()
              }))
            }),
            metadata: Type.Object({
              estimatedAt: Type.String({ format: 'date-time' }),
              version: Type.String(),
              method: Type.String({ enum: ['ai_analysis', 'historical_comparison', 'expert_judgment', 'hybrid'] }),
              confidence: Type.Number({ minimum: 0, maximum: 100 })
            })
          }))
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        503: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: TaskEstimationRequest }>, reply: FastifyReply) => {
    const userId = getCurrentUserId(request);
    
    const { result, duration } = await measureAsyncDuration(async () => {
      return await generateAIEstimations(request.body, userId);
    });

    fastify.logEvent(request, 'aiEstimationRequested', { 
      taskCount: request.body.tasks.length,
      methodology: 'ai_analysis',
      includeBreakdown: request.body.options?.includeBreakdown || false
    });
    
    fastify.logPerformance(request, 'estimateTasks', duration, { 
      taskCount: request.body.tasks.length,
      averageConfidence: result.estimations.reduce((sum, est) => sum + est.estimate.confidence, 0) / result.estimations.length
    });

    return reply.code(200).send(result);
  });

  /**
   * GET /tasks/{taskId}/estimate - Get task estimate
   * Retrieves existing estimation for a specific task
   */
  fastify.get('/:taskId/estimate', {
    schema: {
      tags: ['AI Estimation'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          estimate: Type.Object({
            hours: Type.Number({ minimum: 0 }),
            storyPoints: Type.Number({ minimum: 0 }),
            confidence: Type.Number({ minimum: 0, maximum: 100 }),
            range: Type.Object({
              min: Type.Number({ minimum: 0 }),
              max: Type.Number({ minimum: 0 }),
              mostLikely: Type.Number({ minimum: 0 })
            }),
            breakdown: Type.Object({
              analysis: Type.Number({ minimum: 0 }),
              design: Type.Number({ minimum: 0 }),
              implementation: Type.Number({ minimum: 0 }),
              testing: Type.Number({ minimum: 0 }),
              review: Type.Number({ minimum: 0 }),
              deployment: Type.Number({ minimum: 0 }),
              buffer: Type.Number({ minimum: 0 })
            }),
            factors: Type.Array(Type.Object({
              factor: Type.String(),
              impact: Type.String({ enum: ['decreases', 'neutral', 'increases'] }),
              multiplier: Type.Number({ minimum: 0 }),
              description: Type.String()
            })),
            comparisons: Type.Array(Type.Object({
              taskId: Type.String({ format: 'uuid' }),
              title: Type.String(),
              similarity: Type.Number({ minimum: 0, maximum: 100 }),
              actualHours: Type.Number({ minimum: 0 }),
              variance: Type.Number()
            }))
          }),
          metadata: Type.Object({
            estimatedAt: Type.String({ format: 'date-time' }),
            version: Type.String(),
            method: Type.String({ enum: ['ai_analysis', 'historical_comparison', 'expert_judgment', 'hybrid'] }),
            confidence: Type.Number({ minimum: 0, maximum: 100 })
          })
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params;

    const { result, duration } = await measureAsyncDuration(async () => {
      return await getTaskEstimate(taskId);
    });

    if (!result) {
      return reply.code(404).send({
        error: 'Estimate Not Found',
        message: `No estimation found for task ${taskId}`,
        code: 'ESTIMATE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logPerformance(request, 'getTaskEstimate', duration, { taskId });

    return reply.code(200).send(result);
  });

  /**
   * PUT /tasks/{taskId}/estimate - Update task estimate
   * Updates existing task estimation with new values
   */
  fastify.put('/:taskId/estimate', {
    schema: {
      tags: ['AI Estimation'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        hours: Type.Optional(Type.Number({ minimum: 0 })),
        storyPoints: Type.Optional(Type.Number({ minimum: 0 })),
        confidence: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
        notes: Type.Optional(Type.String()),
        version: Type.Number({ minimum: 1 })
      }),
      response: {
        200: Type.Object({
          estimate: Type.Object({
            hours: Type.Number({ minimum: 0 }),
            storyPoints: Type.Number({ minimum: 0 }),
            confidence: Type.Number({ minimum: 0, maximum: 100 }),
            range: Type.Object({
              min: Type.Number({ minimum: 0 }),
              max: Type.Number({ minimum: 0 }),
              mostLikely: Type.Number({ minimum: 0 })
            }),
            breakdown: Type.Object({
              analysis: Type.Number({ minimum: 0 }),
              design: Type.Number({ minimum: 0 }),
              implementation: Type.Number({ minimum: 0 }),
              testing: Type.Number({ minimum: 0 }),
              review: Type.Number({ minimum: 0 }),
              deployment: Type.Number({ minimum: 0 }),
              buffer: Type.Number({ minimum: 0 })
            }),
            factors: Type.Array(Type.Object({
              factor: Type.String(),
              impact: Type.String({ enum: ['decreases', 'neutral', 'increases'] }),
              multiplier: Type.Number({ minimum: 0 }),
              description: Type.String()
            })),
            comparisons: Type.Array(Type.Object({
              taskId: Type.String({ format: 'uuid' }),
              title: Type.String(),
              similarity: Type.Number({ minimum: 0, maximum: 100 }),
              actualHours: Type.Number({ minimum: 0 }),
              variance: Type.Number()
            }))
          }),
          metadata: Type.Object({
            estimatedAt: Type.String({ format: 'date-time' }),
            version: Type.String(),
            method: Type.String({ enum: ['ai_analysis', 'historical_comparison', 'expert_judgment', 'hybrid'] }),
            confidence: Type.Number({ minimum: 0, maximum: 100 })
          })
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: UpdateTaskEstimateRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);

    const { result, duration } = await measureAsyncDuration(async () => {
      return await updateTaskEstimate(taskId, request.body, userId);
    });

    if (!result) {
      return reply.code(404).send({
        error: 'Estimate Not Found',
        message: `No estimation found for task ${taskId}`,
        code: 'ESTIMATE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'estimationUpdated', { 
      taskId,
      changes: Object.keys(request.body).filter(key => key !== 'version')
    });
    
    fastify.logPerformance(request, 'updateTaskEstimate', duration, { taskId });

    return reply.code(200).send(result);
  });

  /**
   * GET /tasks/estimates/batch - Get batch estimates
   * Retrieves multiple task estimates in a single request
   */
  fastify.get('/estimates/batch', {
    schema: {
      tags: ['AI Estimation'],
      querystring: Type.Object({
        taskIds: Type.String({ description: 'Comma-separated list of task IDs' }),
        includeMetadata: Type.Optional(Type.Boolean({ default: true }))
      }),
      response: {
        200: Type.Object({
          estimates: Type.Array(Type.Object({
            taskId: Type.String({ format: 'uuid' }),
            estimate: Type.Object({
              hours: Type.Number({ minimum: 0 }),
              storyPoints: Type.Number({ minimum: 0 }),
              confidence: Type.Number({ minimum: 0, maximum: 100 }),
              range: Type.Object({
                min: Type.Number({ minimum: 0 }),
                max: Type.Number({ minimum: 0 }),
                mostLikely: Type.Number({ minimum: 0 })
              }),
              breakdown: Type.Object({
                analysis: Type.Number({ minimum: 0 }),
                design: Type.Number({ minimum: 0 }),
                implementation: Type.Number({ minimum: 0 }),
                testing: Type.Number({ minimum: 0 }),
                review: Type.Number({ minimum: 0 }),
                deployment: Type.Number({ minimum: 0 }),
                buffer: Type.Number({ minimum: 0 })
              }),
              factors: Type.Array(Type.Object({
                factor: Type.String(),
                impact: Type.String({ enum: ['decreases', 'neutral', 'increases'] }),
                multiplier: Type.Number({ minimum: 0 }),
                description: Type.String()
              })),
              comparisons: Type.Array(Type.Object({
                taskId: Type.String({ format: 'uuid' }),
                title: Type.String(),
                similarity: Type.Number({ minimum: 0, maximum: 100 }),
                actualHours: Type.Number({ minimum: 0 }),
                variance: Type.Number()
              }))
            }),
            status: Type.String({ enum: ['success', 'failed', 'not_found'] }),
            error: Type.Optional(Type.String())
          })),
          summary: Type.Object({
            totalTasks: Type.Number({ minimum: 0 }),
            successfulEstimates: Type.Number({ minimum: 0 }),
            failedEstimates: Type.Number({ minimum: 0 }),
            totalHours: Type.Number({ minimum: 0 }),
            totalStoryPoints: Type.Number({ minimum: 0 }),
            averageConfidence: Type.Number({ minimum: 0, maximum: 100 })
          }),
          metadata: Type.Object({
            estimatedAt: Type.String({ format: 'date-time' }),
            processingTime: Type.Number({ minimum: 0 })
          })
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { taskIds: string; includeMetadata?: boolean } }>, reply: FastifyReply) => {
    const { taskIds, includeMetadata } = request.query;
    const taskIdArray = taskIds.split(',').map(id => id.trim());

    if (taskIdArray.length === 0) {
      return reply.code(400).send({
        error: 'Invalid Request',
        message: 'At least one task ID must be provided',
        code: 'INVALID_TASK_IDS',
        timestamp: new Date().toISOString()
      });
    }

    const { result, duration } = await measureAsyncDuration(async () => {
      return await getBatchEstimates(taskIdArray, includeMetadata);
    });

    fastify.logPerformance(request, 'getBatchEstimates', duration, { 
      taskCount: taskIdArray.length,
      successfulEstimates: result.summary.successfulEstimates
    });

    return reply.code(200).send(result);
  });

  /**
   * POST /tasks/estimates/batch - Create batch estimates
   * Creates estimates for multiple tasks with velocity-based adjustments
   */
  fastify.post('/estimates/batch', {
    schema: {
      tags: ['AI Estimation'],
      body: Type.Object({
        taskIds: Type.Array(Type.String({ format: 'uuid' })),
        context: Type.Optional(Type.Object({
          teamExperience: Type.String({ enum: ['junior', 'intermediate', 'senior', 'expert'] }),
          projectType: Type.String({ enum: ['greenfield', 'brownfield', 'maintenance', 'migration'] }),
          methodology: Type.String({ enum: ['agile', 'waterfall', 'kanban'] })
        })),
        options: Type.Optional(Type.Object({
          unit: Type.String({ enum: ['hours', 'story_points', 'days'], default: 'hours' }),
          includeBuffer: Type.Boolean({ default: true }),
          includeBreakdown: Type.Boolean({ default: true })
        }))
      }),
      response: {
        201: Type.Object({
          estimates: Type.Array(Type.Object({
            taskId: Type.String({ format: 'uuid' }),
            estimate: Type.Object({
              hours: Type.Number({ minimum: 0 }),
              storyPoints: Type.Number({ minimum: 0 }),
              confidence: Type.Number({ minimum: 0, maximum: 100 }),
              range: Type.Object({
                min: Type.Number({ minimum: 0 }),
                max: Type.Number({ minimum: 0 }),
                mostLikely: Type.Number({ minimum: 0 })
              }),
              breakdown: Type.Object({
                analysis: Type.Number({ minimum: 0 }),
                design: Type.Number({ minimum: 0 }),
                implementation: Type.Number({ minimum: 0 }),
                testing: Type.Number({ minimum: 0 }),
                review: Type.Number({ minimum: 0 }),
                deployment: Type.Number({ minimum: 0 }),
                buffer: Type.Number({ minimum: 0 })
              }),
              factors: Type.Array(Type.Object({
                factor: Type.String(),
                impact: Type.String({ enum: ['decreases', 'neutral', 'increases'] }),
                multiplier: Type.Number({ minimum: 0 }),
                description: Type.String()
              })),
              comparisons: Type.Array(Type.Object({
                taskId: Type.String({ format: 'uuid' }),
                title: Type.String(),
                similarity: Type.Number({ minimum: 0, maximum: 100 }),
                actualHours: Type.Number({ minimum: 0 }),
                variance: Type.Number()
              }))
            }),
            status: Type.String({ enum: ['success', 'failed', 'skipped'] }),
            error: Type.Optional(Type.String())
          })),
          summary: Type.Object({
            totalTasks: Type.Number({ minimum: 0 }),
            successfulEstimates: Type.Number({ minimum: 0 }),
            failedEstimates: Type.Number({ minimum: 0 }),
            totalHours: Type.Number({ minimum: 0 }),
            totalStoryPoints: Type.Number({ minimum: 0 }),
            averageConfidence: Type.Number({ minimum: 0, maximum: 100 })
          }),
          metadata: Type.Object({
            estimatedAt: Type.String({ format: 'date-time' }),
            processingTime: Type.Number({ minimum: 0 })
          })
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        503: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: BatchEstimationRequest }>, reply: FastifyReply) => {
    const userId = getCurrentUserId(request);

    if (request.body.taskIds.length === 0) {
      return reply.code(400).send({
        error: 'Invalid Request',
        message: 'At least one task ID must be provided',
        code: 'INVALID_TASK_IDS',
        timestamp: new Date().toISOString()
      });
    }

    const { result, duration } = await measureAsyncDuration(async () => {
      return await createBatchEstimates(request.body, userId);
    });

    fastify.logEvent(request, 'batchEstimationCreated', { 
      taskCount: request.body.taskIds.length,
      methodology: request.body.context?.methodology || 'agile',
      successfulEstimates: result.summary.successfulEstimates
    });
    
    fastify.logPerformance(request, 'createBatchEstimates', duration, { 
      taskCount: request.body.taskIds.length,
      processingTime: result.metadata.processingTime
    });

    return reply.code(201).send(result);
  });
}

/**
 * Generate AI-powered estimations for tasks
 * Simulates sophisticated AI analysis with multiple methodologies
 */
async function generateAIEstimations(request: TaskEstimationRequest, userId: string): Promise<{ estimations: TaskEstimationResponse[] }> {
  const estimations: TaskEstimationResponse[] = [];
  const methodologies = ['ai_analysis', 'historical_comparison', 'expert_judgment', 'hybrid'] as const;
  
  for (const task of request.tasks) {
    const baseHours = calculateBaseHours(task.type, task.complexity);
    const teamMultiplier = getTeamExperienceMultiplier(request.context?.teamExperience);
    const projectMultiplier = getProjectTypeMultiplier(request.context?.projectType);
    
    // Calculate final estimate with adjustments
    const finalHours = Math.round(baseHours * teamMultiplier * projectMultiplier);
    const confidence = calculateConfidence(task.complexity, request.context?.teamExperience);
    const storyPoints = Math.round(finalHours / 4); // Rough conversion
    
    // Generate range estimates (three-point estimation)
    const range = {
      min: Math.round(finalHours * 0.75),
      max: Math.round(finalHours * 1.5),
      mostLikely: finalHours
    };
    
    // Generate breakdown
    const breakdown = generateBreakdown(finalHours, task.type, request.options?.includeBuffer);
    
    // Generate factors affecting estimation
    const factors = generateEstimationFactors(task.type, task.complexity, request.context);
    
    // Generate historical comparisons
    const comparisons = generateHistoricalComparisons(task.type);
    
    const estimation: TaskEstimationResponse = {
      taskId: task.id,
      estimate: {
        hours: finalHours,
        storyPoints,
        confidence,
        range,
        breakdown,
        factors,
        comparisons
      },
      metadata: {
        estimatedAt: new Date().toISOString(),
        version: '1.0',
        method: methodologies[Math.floor(Math.random() * methodologies.length)],
        confidence
      }
    };
    
    estimations.push(estimation);
  }
  
  return { estimations };
}

/**
 * Get existing task estimate
 */
async function getTaskEstimate(taskId: string): Promise<TaskEstimationResponse | null> {
  // Mock implementation - in real implementation, this would fetch from database
  const mockEstimate: TaskEstimationResponse = {
    taskId,
    estimate: {
      hours: 24,
      storyPoints: 6,
      confidence: 78,
      range: {
        min: 18,
        max: 36,
        mostLikely: 24
      },
      breakdown: {
        analysis: 4,
        design: 6,
        implementation: 12,
        testing: 4,
        review: 2,
        deployment: 1,
        buffer: 5
      },
      factors: [
        {
          factor: 'Task complexity',
          impact: 'increases',
          multiplier: 1.2,
          description: 'Medium complexity increases estimate by 20%'
        },
        {
          factor: 'Team experience',
          impact: 'decreases',
          multiplier: 0.9,
          description: 'Senior team reduces estimate by 10%'
        }
      ],
      comparisons: [
        {
          taskId: randomUUID(),
          title: 'Similar authentication feature',
          similarity: 85,
          actualHours: 22,
          variance: 0.09
        }
      ]
    },
    metadata: {
      estimatedAt: new Date().toISOString(),
      version: '1.0',
      method: 'hybrid',
      confidence: 78
    }
  };
  
  return mockEstimate;
}

/**
 * Update task estimate
 */
async function updateTaskEstimate(taskId: string, updates: UpdateTaskEstimateRequest, userId: string): Promise<TaskEstimationResponse | null> {
  // Mock implementation - in real implementation, this would update database
  const existingEstimate = await getTaskEstimate(taskId);
  if (!existingEstimate) return null;
  
  const updatedEstimate: TaskEstimationResponse = {
    ...existingEstimate,
    estimate: {
      ...existingEstimate.estimate,
      hours: updates.hours ?? existingEstimate.estimate.hours,
      storyPoints: updates.storyPoints ?? existingEstimate.estimate.storyPoints,
      confidence: updates.confidence ?? existingEstimate.estimate.confidence
    },
    metadata: {
      ...existingEstimate.metadata,
      estimatedAt: new Date().toISOString(),
      version: '1.1'
    }
  };
  
  return updatedEstimate;
}

/**
 * Get batch estimates
 */
async function getBatchEstimates(taskIds: string[], includeMetadata: boolean = true): Promise<BatchEstimationResponse> {
  const estimates: BatchEstimationResponse['estimates'] = [];
  let totalHours = 0;
  let totalStoryPoints = 0;
  let totalConfidence = 0;
  let successfulEstimates = 0;
  
  for (const taskId of taskIds) {
    try {
      const estimate = await getTaskEstimate(taskId);
      if (estimate) {
        estimates.push({
          taskId,
          estimate: estimate.estimate as any,
          status: 'success' as const
        });
        totalHours += estimate.estimate.hours;
        totalStoryPoints += estimate.estimate.storyPoints;
        totalConfidence += estimate.estimate.confidence;
        successfulEstimates++;
      } else {
        estimates.push({
          taskId,
          estimate: {} as any, // Will be filtered out by status
          status: 'failed' as const,
          error: 'No estimate found for task'
        });
      }
    } catch (error) {
      estimates.push({
        taskId,
        estimate: {} as any, // Will be filtered out by status
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    estimates,
    summary: {
      totalTasks: taskIds.length,
      successfulEstimates,
      failedEstimates: taskIds.length - successfulEstimates,
      totalHours,
      totalStoryPoints,
      averageConfidence: successfulEstimates > 0 ? totalConfidence / successfulEstimates : 0
    },
    metadata: {
      estimatedAt: new Date().toISOString(),
      processingTime: Math.random() * 1000 + 500 // Mock processing time
    }
  };
}

/**
 * Create batch estimates
 */
async function createBatchEstimates(request: BatchEstimationRequest, userId: string): Promise<BatchEstimationResponse> {
  const estimates: BatchEstimationResponse['estimates'] = [];
  let totalHours = 0;
  let totalStoryPoints = 0;
  let totalConfidence = 0;
  let successfulEstimates = 0;
  
  for (const taskId of request.taskIds) {
    try {
      // Generate new estimate for each task
      const baseHours = 16 + Math.random() * 32; // Random base hours
      const teamMultiplier = getTeamExperienceMultiplier(request.context?.teamExperience);
      const projectMultiplier = getProjectTypeMultiplier(request.context?.projectType);
      
      const finalHours = Math.round(baseHours * teamMultiplier * projectMultiplier);
      const confidence = 65 + Math.random() * 30; // Random confidence 65-95%
      const storyPoints = Math.round(finalHours / 4);
      
      const estimate = {
        hours: finalHours,
        storyPoints,
        confidence,
        range: {
          min: Math.round(finalHours * 0.75),
          max: Math.round(finalHours * 1.5),
          mostLikely: finalHours
        },
        breakdown: generateBreakdown(finalHours, 'feature', request.options?.includeBuffer),
        factors: generateEstimationFactors('feature', 'medium', request.context),
        comparisons: generateHistoricalComparisons('feature')
      };
      
      estimates.push({
        taskId,
        estimate: estimate as any,
        status: 'success' as const
      });
      
      totalHours += finalHours;
      totalStoryPoints += storyPoints;
      totalConfidence += confidence;
      successfulEstimates++;
    } catch (error) {
      estimates.push({
        taskId,
        estimate: {} as any,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    estimates,
    summary: {
      totalTasks: request.taskIds.length,
      successfulEstimates,
      failedEstimates: request.taskIds.length - successfulEstimates,
      totalHours,
      totalStoryPoints,
      averageConfidence: successfulEstimates > 0 ? totalConfidence / successfulEstimates : 0
    },
    metadata: {
      estimatedAt: new Date().toISOString(),
      processingTime: Math.random() * 2000 + 1000 // Mock processing time
    }
  };
}

/**
 * Helper functions for estimation calculations
 */
function calculateBaseHours(type: string, complexity?: string): number {
  const baseHours = {
    feature: 20,
    bug: 8,
    maintenance: 12,
    research: 16,
    documentation: 6
  };
  
  const complexityMultipliers = {
    low: 0.7,
    medium: 1.0,
    high: 1.5,
    very_high: 2.0
  };
  
  const base = baseHours[type as keyof typeof baseHours] || 16;
  const multiplier = complexityMultipliers[complexity as keyof typeof complexityMultipliers] || 1.0;
  
  return Math.round(base * multiplier);
}

function getTeamExperienceMultiplier(experience?: string): number {
  const multipliers = {
    junior: 1.4,
    intermediate: 1.1,
    senior: 0.9,
    expert: 0.75
  };
  
  return multipliers[experience as keyof typeof multipliers] || 1.0;
}

function getProjectTypeMultiplier(projectType?: string): number {
  const multipliers = {
    greenfield: 1.0,
    brownfield: 1.3,
    maintenance: 0.8,
    migration: 1.6
  };
  
  return multipliers[projectType as keyof typeof multipliers] || 1.0;
}

function calculateConfidence(complexity?: string, experience?: string): number {
  let baseConfidence = 75;
  
  if (complexity === 'low') baseConfidence += 10;
  else if (complexity === 'very_high') baseConfidence -= 15;
  
  if (experience === 'expert') baseConfidence += 15;
  else if (experience === 'junior') baseConfidence -= 10;
  
  return Math.max(30, Math.min(95, baseConfidence));
}

function generateBreakdown(totalHours: number, type: string, includeBuffer: boolean = true): any {
  const baseBreakdown = {
    feature: { analysis: 0.15, design: 0.25, implementation: 0.4, testing: 0.15, review: 0.05, deployment: 0.05 },
    bug: { analysis: 0.2, design: 0.1, implementation: 0.5, testing: 0.15, review: 0.05, deployment: 0.05 },
    maintenance: { analysis: 0.1, design: 0.1, implementation: 0.6, testing: 0.15, review: 0.05, deployment: 0.05 },
    research: { analysis: 0.4, design: 0.2, implementation: 0.2, testing: 0.1, review: 0.1, deployment: 0.05 },
    documentation: { analysis: 0.3, design: 0.0, implementation: 0.6, testing: 0.05, review: 0.05, deployment: 0.05 }
  };
  
  const breakdown = baseBreakdown[type as keyof typeof baseBreakdown] || baseBreakdown.feature;
  const bufferPercentage = includeBuffer ? 0.2 : 0;
  const workHours = totalHours * (1 - bufferPercentage);
  
  return {
    analysis: Math.round(workHours * breakdown.analysis),
    design: Math.round(workHours * breakdown.design),
    implementation: Math.round(workHours * breakdown.implementation),
    testing: Math.round(workHours * breakdown.testing),
    review: Math.round(workHours * breakdown.review),
    deployment: Math.round(workHours * breakdown.deployment),
    buffer: Math.round(totalHours * bufferPercentage)
  };
}

function generateEstimationFactors(type: string, complexity?: string, context?: any): any[] {
  const factors = [
    {
      factor: 'Task complexity',
      impact: complexity === 'high' || complexity === 'very_high' ? 'increases' : 'neutral',
      multiplier: complexity === 'high' ? 1.5 : complexity === 'very_high' ? 2.0 : 1.0,
      description: `${complexity || 'Medium'} complexity ${complexity === 'high' || complexity === 'very_high' ? 'increases' : 'maintains'} estimate`
    },
    {
      factor: 'Team experience',
      impact: context?.teamExperience === 'senior' || context?.teamExperience === 'expert' ? 'decreases' : 'increases',
      multiplier: context?.teamExperience === 'expert' ? 0.75 : context?.teamExperience === 'senior' ? 0.9 : 1.1,
      description: `${context?.teamExperience || 'intermediate'} team experience affects estimate`
    },
    {
      factor: 'Project type',
      impact: context?.projectType === 'brownfield' || context?.projectType === 'migration' ? 'increases' : 'neutral',
      multiplier: context?.projectType === 'migration' ? 1.6 : context?.projectType === 'brownfield' ? 1.3 : 1.0,
      description: `${context?.projectType || 'greenfield'} project adds complexity`
    }
  ];
  
  return factors;
}

function generateHistoricalComparisons(type: string): any[] {
  const comparisons = [
    {
      taskId: randomUUID(),
      title: `Similar ${type} implementation`,
      similarity: 75 + Math.random() * 20,
      actualHours: 18 + Math.random() * 16,
      variance: -0.1 + Math.random() * 0.2
    },
    {
      taskId: randomUUID(),
      title: `Related ${type} feature`,
      similarity: 65 + Math.random() * 25,
      actualHours: 12 + Math.random() * 24,
      variance: -0.15 + Math.random() * 0.3
    }
  ];
  
  return comparisons;
}