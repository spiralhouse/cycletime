import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { Dashboard, DashboardPanel } from '../types';

export class DashboardService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async createDashboard(dashboardData: Partial<Dashboard>): Promise<Dashboard> {
    try {
      const dashboard = this.mockDataService.addDashboard(dashboardData);

      // Publish dashboard created event
      await this.eventService.publishDashboardCreated(dashboard);

      logger.info({
        dashboardId: dashboard.id,
        title: dashboard.title,
        panelCount: dashboard.panels.length,
        tags: dashboard.tags,
      }, 'Dashboard created');

      return dashboard;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardData,
      }, 'Failed to create dashboard');
      throw error;
    }
  }

  async updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard | undefined> {
    try {
      const originalDashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!originalDashboard) {
        return undefined;
      }

      const dashboard = this.mockDataService.updateDashboard(dashboardId, updates);
      
      if (dashboard) {
        // Determine what changed
        const changes: string[] = [];
        if (updates.title && updates.title !== originalDashboard.title) {
          changes.push('title');
        }
        if (updates.description && updates.description !== originalDashboard.description) {
          changes.push('description');
        }
        if (updates.panels) {
          changes.push('panels');
        }
        if (updates.tags) {
          changes.push('tags');
        }

        // Publish dashboard updated event
        await this.eventService.publishDashboardUpdated(dashboard, changes);

        logger.info({
          dashboardId,
          title: dashboard.title,
          changes,
        }, 'Dashboard updated');
      }

      return dashboard;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
        updates,
      }, 'Failed to update dashboard');
      throw error;
    }
  }

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    try {
      const dashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!dashboard) {
        return false;
      }

      const success = this.mockDataService.deleteDashboard(dashboardId);

      if (success) {
        logger.info({
          dashboardId,
          title: dashboard.title,
        }, 'Dashboard deleted');
      }

      return success;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
      }, 'Failed to delete dashboard');
      throw error;
    }
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      return this.mockDataService.getDashboardById(dashboardId);
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
      }, 'Failed to get dashboard');
      throw error;
    }
  }

  async getDashboards(filters?: { tags?: string[]; starred?: boolean }): Promise<Dashboard[]> {
    try {
      let dashboards = this.mockDataService.getDashboards();

      if (filters?.tags && filters.tags.length > 0) {
        dashboards = dashboards.filter(d => 
          filters.tags!.some(tag => d.tags.includes(tag))
        );
      }

      if (filters?.starred !== undefined) {
        dashboards = dashboards.filter(d => d.isStarred === filters.starred);
      }

      return dashboards;
    } catch (error) {
      logger.error({
        error: error.message,
        filters,
      }, 'Failed to get dashboards');
      throw error;
    }
  }

  async addPanel(dashboardId: string, panel: DashboardPanel): Promise<Dashboard | undefined> {
    try {
      const dashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!dashboard) {
        return undefined;
      }

      const updatedPanels = [...dashboard.panels, panel];
      const updated = await this.updateDashboard(dashboardId, {
        panels: updatedPanels,
      });

      if (updated) {
        logger.info({
          dashboardId,
          panelId: panel.id,
          panelTitle: panel.title,
          panelType: panel.type,
        }, 'Panel added to dashboard');
      }

      return updated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
        panel,
      }, 'Failed to add panel to dashboard');
      throw error;
    }
  }

  async updatePanel(dashboardId: string, panelId: string, updates: Partial<DashboardPanel>): Promise<Dashboard | undefined> {
    try {
      const dashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!dashboard) {
        return undefined;
      }

      const panelIndex = dashboard.panels.findIndex(p => p.id === panelId);
      if (panelIndex === -1) {
        return undefined;
      }

      const updatedPanels = [...dashboard.panels];
      updatedPanels[panelIndex] = {
        ...updatedPanels[panelIndex],
        ...updates,
      };

      const updated = await this.updateDashboard(dashboardId, {
        panels: updatedPanels,
      });

      if (updated) {
        logger.info({
          dashboardId,
          panelId,
          updates: Object.keys(updates),
        }, 'Panel updated in dashboard');
      }

      return updated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
        panelId,
        updates,
      }, 'Failed to update panel in dashboard');
      throw error;
    }
  }

  async removePanel(dashboardId: string, panelId: string): Promise<Dashboard | undefined> {
    try {
      const dashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!dashboard) {
        return undefined;
      }

      const updatedPanels = dashboard.panels.filter(p => p.id !== panelId);
      const updated = await this.updateDashboard(dashboardId, {
        panels: updatedPanels,
      });

      if (updated) {
        logger.info({
          dashboardId,
          panelId,
        }, 'Panel removed from dashboard');
      }

      return updated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
        panelId,
      }, 'Failed to remove panel from dashboard');
      throw error;
    }
  }

  async starDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      const updated = await this.updateDashboard(dashboardId, {
        isStarred: true,
      });

      if (updated) {
        logger.info({
          dashboardId,
          title: updated.title,
        }, 'Dashboard starred');
      }

      return updated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
      }, 'Failed to star dashboard');
      throw error;
    }
  }

  async unstarDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      const updated = await this.updateDashboard(dashboardId, {
        isStarred: false,
      });

      if (updated) {
        logger.info({
          dashboardId,
          title: updated.title,
        }, 'Dashboard unstarred');
      }

      return updated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
      }, 'Failed to unstar dashboard');
      throw error;
    }
  }

  async duplicateDashboard(dashboardId: string, newTitle?: string): Promise<Dashboard | undefined> {
    try {
      const original = this.mockDataService.getDashboardById(dashboardId);
      if (!original) {
        return undefined;
      }

      const duplicated = await this.createDashboard({
        title: newTitle || `${original.title} (Copy)`,
        description: original.description,
        tags: [...original.tags],
        panels: original.panels.map(panel => ({
          ...panel,
          id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
        isStarred: false,
        createdBy: original.createdBy,
      });

      logger.info({
        originalId: dashboardId,
        duplicatedId: duplicated.id,
        title: duplicated.title,
      }, 'Dashboard duplicated');

      return duplicated;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
        newTitle,
      }, 'Failed to duplicate dashboard');
      throw error;
    }
  }

  async exportDashboard(dashboardId: string): Promise<any> {
    try {
      const dashboard = this.mockDataService.getDashboardById(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        dashboard: {
          title: dashboard.title,
          description: dashboard.description,
          tags: dashboard.tags,
          panels: dashboard.panels,
        },
      };

      logger.info({
        dashboardId,
        title: dashboard.title,
        panelCount: dashboard.panels.length,
      }, 'Dashboard exported');

      return exportData;
    } catch (error) {
      logger.error({
        error: error.message,
        dashboardId,
      }, 'Failed to export dashboard');
      throw error;
    }
  }

  async importDashboard(importData: any, importOptions?: { overwrite?: boolean }): Promise<Dashboard> {
    try {
      if (!importData.dashboard) {
        throw new Error('Invalid import data: missing dashboard');
      }

      const { dashboard: dashboardData } = importData;
      
      // Generate new IDs for panels
      const panels = dashboardData.panels.map((panel: any) => ({
        ...panel,
        id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      const dashboard = await this.createDashboard({
        title: dashboardData.title,
        description: dashboardData.description,
        tags: dashboardData.tags || [],
        panels,
        createdBy: 'import',
      });

      logger.info({
        dashboardId: dashboard.id,
        title: dashboard.title,
        panelCount: panels.length,
      }, 'Dashboard imported');

      return dashboard;
    } catch (error) {
      logger.error({
        error: error.message,
        importData,
      }, 'Failed to import dashboard');
      throw error;
    }
  }

  async getDashboardStatistics() {
    try {
      const dashboards = this.mockDataService.getDashboards();
      
      const stats = {
        total: dashboards.length,
        starred: dashboards.filter(d => d.isStarred).length,
        archived: dashboards.filter(d => d.isArchived).length,
        totalPanels: dashboards.reduce((sum, d) => sum + d.panels.length, 0),
        averagePanelsPerDashboard: dashboards.length > 0 
          ? dashboards.reduce((sum, d) => sum + d.panels.length, 0) / dashboards.length 
          : 0,
        popularTags: this.getPopularTags(dashboards),
        panelTypes: this.getPanelTypeStats(dashboards),
      };

      return stats;
    } catch (error) {
      logger.error({
        error: error.message,
      }, 'Failed to get dashboard statistics');
      throw error;
    }
  }

  private getPopularTags(dashboards: Dashboard[]): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();
    
    dashboards.forEach(dashboard => {
      dashboard.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getPanelTypeStats(dashboards: Dashboard[]): Array<{ type: string; count: number }> {
    const typeCounts = new Map<string, number>();
    
    dashboards.forEach(dashboard => {
      dashboard.panels.forEach(panel => {
        typeCounts.set(panel.type, (typeCounts.get(panel.type) || 0) + 1);
      });
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}