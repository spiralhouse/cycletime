import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const dashboardController: FastifyPluginAsync = async (fastify) => {
  // Get all dashboards
  fastify.get('/', {
    schema: {
      description: 'List all dashboards',
      tags: ['Dashboards'],
      response: {
        200: Type.Object({
          dashboards: Type.Array(Type.Object({
            id: Type.String(),
            title: Type.String(),
            description: Type.Optional(Type.String()),
            tags: Type.Array(Type.String()),
            panelCount: Type.Number(),
            isStarred: Type.Boolean(),
            createdAt: Type.String(),
            updatedAt: Type.String(),
          })),
          total: Type.Number(),
        }),
      },
    },
  }, async (_request, reply) => {
    const dashboards = await fastify.dashboardService.getDashboards();

    const dashboardSummaries = dashboards.map(dashboard => ({
      id: dashboard.id,
      title: dashboard.title,
      description: dashboard.description,
      tags: dashboard.tags,
      panelCount: dashboard.panels.length,
      isStarred: dashboard.isStarred,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    }));

    reply.send({
      dashboards: dashboardSummaries,
      total: dashboards.length,
    });
  });

  // Create a new dashboard
  fastify.post('/', {
    schema: {
      description: 'Create a new dashboard',
      tags: ['Dashboards'],
      body: Type.Object({
        title: Type.String(),
        description: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        panels: Type.Array(Type.Object({
          id: Type.String(),
          title: Type.String(),
          type: Type.String(),
          metrics: Type.Array(Type.String()),
          timeRange: Type.String(),
          gridPos: Type.Object({
            x: Type.Number(),
            y: Type.Number(),
            w: Type.Number(),
            h: Type.Number(),
          }),
        })),
      }),
      response: {
        201: Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.Optional(Type.String()),
          tags: Type.Array(Type.String()),
          panels: Type.Array(Type.Any()),
          isStarred: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const dashboardData = request.body as any;

    const dashboard = await fastify.dashboardService.createDashboard(dashboardData);

    reply.status(201).send({
      id: dashboard.id,
      title: dashboard.title,
      description: dashboard.description,
      tags: dashboard.tags,
      panels: dashboard.panels,
      isStarred: dashboard.isStarred,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    });
  });

  // Get specific dashboard
  fastify.get('/:dashboardId', {
    schema: {
      description: 'Get dashboard details',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.Optional(Type.String()),
          tags: Type.Array(Type.String()),
          panels: Type.Array(Type.Any()),
          isStarred: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };

    const dashboard = await fastify.dashboardService.getDashboard(dashboardId);
    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    reply.send({
      id: dashboard.id,
      title: dashboard.title,
      description: dashboard.description,
      tags: dashboard.tags,
      panels: dashboard.panels,
      isStarred: dashboard.isStarred,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    });
  });

  // Update dashboard
  fastify.put('/:dashboardId', {
    schema: {
      description: 'Update dashboard',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      body: Type.Object({
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        panels: Type.Optional(Type.Array(Type.Any())),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.Optional(Type.String()),
          tags: Type.Array(Type.String()),
          panels: Type.Array(Type.Any()),
          isStarred: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };
    const updates = request.body as any;

    const dashboard = await fastify.dashboardService.updateDashboard(dashboardId, updates);
    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    reply.send({
      id: dashboard.id,
      title: dashboard.title,
      description: dashboard.description,
      tags: dashboard.tags,
      panels: dashboard.panels,
      isStarred: dashboard.isStarred,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    });
  });

  // Delete dashboard
  fastify.delete('/:dashboardId', {
    schema: {
      description: 'Delete dashboard',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      response: {
        204: Type.Null(),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };

    const success = await fastify.dashboardService.deleteDashboard(dashboardId);
    if (!success) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    reply.status(204).send();
  });

  // Star/unstar dashboard
  fastify.post('/:dashboardId/star', {
    schema: {
      description: 'Star dashboard',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          title: Type.String(),
          isStarred: Type.Boolean(),
        }),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };

    const dashboard = await fastify.dashboardService.starDashboard(dashboardId);
    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    reply.send({
      id: dashboard.id,
      title: dashboard.title,
      isStarred: dashboard.isStarred,
    });
  });

  fastify.delete('/:dashboardId/star', {
    schema: {
      description: 'Unstar dashboard',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          title: Type.String(),
          isStarred: Type.Boolean(),
        }),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };

    const dashboard = await fastify.dashboardService.unstarDashboard(dashboardId);
    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    reply.send({
      id: dashboard.id,
      title: dashboard.title,
      isStarred: dashboard.isStarred,
    });
  });

  // Export dashboard
  fastify.get('/:dashboardId/export', {
    schema: {
      description: 'Export dashboard',
      tags: ['Dashboards'],
      params: Type.Object({
        dashboardId: Type.String(),
      }),
      response: {
        200: Type.Any(),
      },
    },
  }, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };

    try {
      const exportData = await fastify.dashboardService.exportDashboard(dashboardId);
      
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="dashboard-${dashboardId}.json"`);
      reply.send(exportData);
    } catch (error) {
      reply.status(404).send({ error: (error as Error).message });
    }
  });

  // Import dashboard
  fastify.post('/import', {
    schema: {
      description: 'Import dashboard',
      tags: ['Dashboards'],
      body: Type.Any(),
      response: {
        201: Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.Optional(Type.String()),
          tags: Type.Array(Type.String()),
          panels: Type.Array(Type.Any()),
          isStarred: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const importData = request.body as any;

    try {
      const dashboard = await fastify.dashboardService.importDashboard(importData);

      reply.status(201).send({
        id: dashboard.id,
        title: dashboard.title,
        description: dashboard.description,
        tags: dashboard.tags,
        panels: dashboard.panels,
        isStarred: dashboard.isStarred,
        createdAt: dashboard.createdAt.toISOString(),
        updatedAt: dashboard.updatedAt.toISOString(),
      });
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });
};

export { dashboardController };