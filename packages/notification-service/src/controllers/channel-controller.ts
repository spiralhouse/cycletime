import { FastifyPluginAsync } from 'fastify';

const channelController: FastifyPluginAsync = async (fastify) => {
  // Get all channels
  fastify.get('/', async (_request, reply) => {
    const channels = fastify.mockDataService.getChannels();
    reply.send({
      channels: channels.map(c => ({
        type: c.type,
        name: c.name,
        description: c.description,
        isEnabled: c.isEnabled,
        isConfigured: c.isConfigured,
        lastTestedAt: c.lastTestedAt?.toISOString(),
        status: c.status,
      })),
    });
  });

  // Get channel configuration
  fastify.get('/:channelType/config', async (request, reply) => {
    const { channelType } = request.params as { channelType: string };
    
    const channel = fastify.mockDataService.getChannelByType(channelType);
    if (!channel) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    reply.send({
      channelType: channel.type,
      config: channel.config,
      isEnabled: channel.isEnabled,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Update channel configuration
  fastify.put('/:channelType/config', async (request, reply) => {
    const { channelType } = request.params as { channelType: string };
    const { config } = request.body as { config: any; isEnabled?: boolean };
    
    const updatedChannel = fastify.mockDataService.updateChannelConfig(channelType, config);
    if (!updatedChannel) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    reply.send({
      channelType: updatedChannel.type,
      config: updatedChannel.config,
      isEnabled: updatedChannel.isEnabled,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Test channel
  fastify.post('/:channelType/test', async (request, reply) => {
    const { channelType } = request.params as { channelType: string };
    const { recipient, message } = request.body as { recipient: string; message?: string };
    
    const channel = fastify.mockDataService.getChannelByType(channelType);
    if (!channel) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    // Simulate test
    const testId = `test-${Date.now()}`;
    const success = Math.random() > 0.1; // 90% success rate for tests
    
    reply.send({
      success,
      message: success ? `Test message sent successfully to ${recipient}` : 'Test message failed to send',
      testId,
      timestamp: new Date().toISOString(),
      details: {
        channelType,
        recipient,
        message: message || `Test message from CycleTime Notification Service`,
      },
    });
  });
};

export { channelController };