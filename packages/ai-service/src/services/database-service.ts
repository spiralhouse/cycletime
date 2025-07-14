import { PrismaClient } from '../lib/prisma';
import { AIRequest, AIResponse, AiRequestType, AiRequestStatus, TokenUsage } from '../interfaces/ai-types';

/**
 * Database service for AI request/response storage and tracking
 */
export class DatabaseService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create AI request in database
   */
  async createAIRequest(
    request: AIRequest,
    userId: string,
    projectId?: string
  ) {
    const dbRequest = await this.prisma.aiRequest.create({
      data: {
        id: request.id,
        project_id: projectId || null,
        user_id: userId,
        type: this.mapAiRequestType(request.type) as any,
        status: 'PENDING',
        prompt: request.prompt,
        context: (request.context || {}) as any,
        model: request.model || 'claude-4-sonnet',
      },
    });

    return dbRequest;
  }

  /**
   * Update AI request status
   */
  async updateAIRequestStatus(requestId: string, status: AiRequestStatus) {
    return await this.prisma.aiRequest.update({
      where: { id: requestId },
      data: { status: status as any },
    });
  }

  /**
   * Store AI response in database
   */
  async storeAIResponse(requestId: string, response: AIResponse) {
    const dbResponse = await this.prisma.aiResponse.create({
      data: {
        id: response.id,
        request_id: requestId,
        content: response.content,
        tokens_used: response.metadata.tokenUsage.totalTokens,
        model: response.model,
        finish_reason: response.metadata.stopReason || null,
        metadata: {
          provider: response.provider,
          providerId: response.metadata.providerId,
          performance: response.performance,
        },
      },
    });

    return dbResponse;
  }

  /**
   * Track usage with cost calculation
   */
  async trackUsage(
    requestId: string,
    tokenUsage: TokenUsage,
    model: string,
    costEstimate: number
  ) {
    const usage = await this.prisma.usageTracking.create({
      data: {
        request_id: requestId,
        model: model,
        prompt_tokens: tokenUsage.inputTokens,
        completion_tokens: tokenUsage.outputTokens,
        total_tokens: tokenUsage.totalTokens,
        cost_estimate: costEstimate,
      },
    });

    return usage;
  }

  /**
   * Retrieve AI request by ID with related data
   */
  async getAIRequest(requestId: string) {
    return await this.prisma.aiRequest.findUnique({
      where: { id: requestId },
      include: {
        responses: true,
        usage: true,
        project: true,
        user: true,
      },
    });
  }

  /**
   * Map AIRequest types to database enum values
   */
  mapAiRequestType(type: AiRequestType): string {
    const typeMapping = {
      [AiRequestType.PRD_ANALYSIS]: 'PLANNING',
      [AiRequestType.PROJECT_PLAN_GENERATION]: 'PLANNING',
      [AiRequestType.TASK_BREAKDOWN]: 'TASK_ANALYSIS',
      [AiRequestType.DOCUMENT_GENERATION]: 'DOCUMENTATION',
      [AiRequestType.CODE_REVIEW]: 'CODE_REVIEW',
      [AiRequestType.GENERAL_QUERY]: 'GENERAL',
    };

    return typeMapping[type];
  }
}