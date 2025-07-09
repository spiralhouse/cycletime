import { FastifyRequest, FastifyReply } from 'fastify';

export const requestLogger = async (request: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now();

  // Log request completion on response
  reply.raw.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log request completion
    request.log.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
    }, 'Request completed');
  });
};