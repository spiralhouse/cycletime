import { FastifyPluginAsync } from 'fastify';

const templateController: FastifyPluginAsync = async (fastify) => {
  // Get all templates
  fastify.get('/', async (_request, reply) => {
    const templates = fastify.mockDataService.getTemplates();
    reply.send({
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        channel: t.channel,
        category: t.category,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      total: templates.length,
    });
  });

  // Create template
  fastify.post('/', async (request, reply) => {
    const templateData = request.body as any;
    const template = await fastify.templateService.createTemplate(templateData);
    reply.status(201).send(template);
  });

  // Get specific template
  fastify.get('/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };
    const template = fastify.mockDataService.getTemplateById(templateId);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    reply.send(template);
  });

  // Update template
  fastify.put('/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };
    const updates = request.body as any;
    const template = await fastify.templateService.updateTemplate(templateId, updates);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    reply.send(template);
  });

  // Delete template
  fastify.delete('/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };
    const success = await fastify.templateService.deleteTemplate(templateId);
    if (!success) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    reply.status(204).send();
  });

  // Preview template
  fastify.post('/:templateId/preview', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };
    const { data } = request.body as { data: Record<string, any> };
    
    try {
      const preview = await fastify.templateService.previewTemplate(templateId, data);
      reply.send(preview);
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });
};

export { templateController };