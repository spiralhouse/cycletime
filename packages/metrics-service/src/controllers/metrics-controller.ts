import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const metricsController: FastifyPluginAsync = async (fastify) => {
  // Get all metrics
  fastify.get('/', {
    schema: {
      description: 'List all metrics',
      tags: ['Metrics'],
      querystring: Type.Object({
        category: Type.Optional(Type.String()),
        service: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          metrics: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            category: Type.String(),
            type: Type.String(),
            unit: Type.Optional(Type.String()),
            service: Type.String(),
            lastValue: Type.Number(),
            lastUpdated: Type.String(),
          })),
          total: Type.Number(),
          categories: Type.Array(Type.String()),
        }),
      },
    },
  }, async (request, reply) => {
    const { category, service } = request.query as { category?: string; service?: string };
    
    const metrics = await fastify.metricsCollectionService.getMetrics({
      category,
      service,
    });

    const metricSummaries = metrics.map(metric => ({
      id: metric.id,
      name: metric.name,
      description: metric.description,
      category: metric.category,
      type: metric.type,
      unit: metric.unit,
      service: metric.service,
      lastValue: metric.value,
      lastUpdated: metric.updatedAt.toISOString(),
    }));

    const categories = Array.from(new Set(metrics.map(m => m.category)));

    reply.send({
      metrics: metricSummaries,
      total: metrics.length,
      categories,
    });
  });

  // Record a custom metric
  fastify.post('/', {
    schema: {
      description: 'Record a custom metric',
      tags: ['Metrics'],
      body: Type.Object({
        name: Type.String(),
        value: Type.Number(),
        type: Type.String(),
        unit: Type.Optional(Type.String()),
        labels: Type.Optional(Type.Object({}, { additionalProperties: Type.String() })),
        timestamp: Type.Optional(Type.String()),
      }),
      response: {
        201: Type.Object({
          id: Type.String(),
          name: Type.String(),
          value: Type.Number(),
          type: Type.String(),
          unit: Type.Optional(Type.String()),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          timestamp: Type.String(),
          recorded: Type.Boolean(),
        }),
      },
    },
  }, async (request, reply) => {
    const metricRecord = request.body as any;
    
    if (metricRecord.timestamp) {
      metricRecord.timestamp = new Date(metricRecord.timestamp);
    }

    const metric = await fastify.metricsCollectionService.collectMetric(metricRecord);

    reply.status(201).send({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      type: metric.type,
      unit: metric.unit,
      labels: metric.labels,
      timestamp: metric.timestamp.toISOString(),
      recorded: true,
    });
  });

  // Get specific metric details
  fastify.get('/:metricId', {
    schema: {
      description: 'Get metric details',
      tags: ['Metrics'],
      params: Type.Object({
        metricId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.String(),
          category: Type.String(),
          type: Type.String(),
          unit: Type.Optional(Type.String()),
          service: Type.String(),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          statistics: Type.Object({
            min: Type.Number(),
            max: Type.Number(),
            avg: Type.Number(),
            count: Type.Number(),
            sum: Type.Number(),
          }),
          lastValue: Type.Number(),
          lastUpdated: Type.String(),
          createdAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { metricId } = request.params as { metricId: string };
    
    const metric = fastify.mockDataService.getMetricById(metricId);
    if (!metric) {
      return reply.status(404).send({ error: 'Metric not found' });
    }

    const statistics = await fastify.metricsCollectionService.getMetricStatistics(metricId);

    reply.send({
      id: metric.id,
      name: metric.name,
      description: metric.description,
      category: metric.category,
      type: metric.type,
      unit: metric.unit,
      service: metric.service,
      labels: metric.labels,
      statistics,
      lastValue: metric.value,
      lastUpdated: metric.updatedAt.toISOString(),
      createdAt: metric.createdAt.toISOString(),
    });
  });

  // Get metric history
  fastify.get('/:metricId/history', {
    schema: {
      description: 'Get metric history',
      tags: ['Metrics'],
      params: Type.Object({
        metricId: Type.String(),
      }),
      querystring: Type.Object({
        timeRange: Type.Optional(Type.String()),
        resolution: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          metric: Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            category: Type.String(),
            type: Type.String(),
            unit: Type.Optional(Type.String()),
            service: Type.String(),
            lastValue: Type.Number(),
            lastUpdated: Type.String(),
          }),
          timeRange: Type.String(),
          resolution: Type.String(),
          dataPoints: Type.Array(Type.Object({
            timestamp: Type.String(),
            value: Type.Number(),
            labels: Type.Optional(Type.Object({}, { additionalProperties: Type.String() })),
          })),
        }),
      },
    },
  }, async (request, reply) => {
    const { metricId } = request.params as { metricId: string };
    const { timeRange = '24h', resolution = '5m' } = request.query as { timeRange?: string; resolution?: string };

    try {
      const history = await fastify.metricsCollectionService.getMetricHistory(metricId, timeRange, resolution);

      reply.send({
        metric: {
          id: history.metric.id,
          name: history.metric.name,
          description: history.metric.description,
          category: history.metric.category,
          type: history.metric.type,
          unit: history.metric.unit,
          service: history.metric.service,
          lastValue: history.metric.lastValue,
          lastUpdated: history.metric.lastUpdated.toISOString(),
        },
        timeRange: history.timeRange,
        resolution: history.resolution,
        dataPoints: history.dataPoints.map(dp => ({
          timestamp: dp.timestamp.toISOString(),
          value: dp.value,
          labels: dp.labels,
        })),
      });
    } catch (error) {
      reply.status(404).send({ error: error.message });
    }
  });
};

export { metricsController };