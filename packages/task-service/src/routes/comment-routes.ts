import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { AddCommentRequest, AddCommentSchema } from '../types/task-types';
import { getCurrentUserId } from '../middleware/auth-middleware';

export async function commentRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task comments
  fastify.get('/:taskId/comments', {
    schema: {
      description: 'Get comments for a task',
      tags: ['Comments'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 }))
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Querystring: { page?: number; limit?: number } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const { page, limit } = request.query;

    const comments = await fastify.taskService.getComments(taskId, { page, limit });
    return reply.code(200).send(comments);
  });

  // Add task comment
  fastify.post('/:taskId/comments', {
    schema: {
      description: 'Add a comment to a task',
      tags: ['Comments'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        content: Type.String({ minLength: 1 }),
        parentId: Type.Optional(Type.String({ format: 'uuid' })),
        attachments: Type.Optional(Type.Array(Type.Object({
          filename: Type.String(),
          data: Type.String(),
          mimeType: Type.String()
        })))
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: AddCommentRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const commentRequest = AddCommentSchema.parse(request.body);

    const comment = await fastify.taskService.addComment(taskId, commentRequest, userId);
    return reply.code(201).send(comment);
  });
}