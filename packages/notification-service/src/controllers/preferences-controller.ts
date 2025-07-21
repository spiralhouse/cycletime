import { FastifyPluginAsync } from 'fastify';

const preferencesController: FastifyPluginAsync = async (fastify) => {
  // Get all preferences
  fastify.get('/', async (_request, reply) => {
    const preferences = fastify.mockDataService.getUserPreferences();
    reply.send({
      preferences: preferences.map(p => ({
        userId: p.userId,
        channels: p.channels,
        categories: p.categories,
        timezone: p.timezone,
        quietHours: p.quietHours,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  });

  // Get user preferences
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const preferences = fastify.mockDataService.getUserPreferencesById(userId);
    if (!preferences) {
      return reply.status(404).send({ error: 'Preferences not found' });
    }
    reply.send(preferences);
  });

  // Update user preferences
  fastify.put('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const updates = request.body as any;
    const preferences = await fastify.preferencesService.updatePreferences(userId, updates);
    reply.send(preferences);
  });
};

export { preferencesController };