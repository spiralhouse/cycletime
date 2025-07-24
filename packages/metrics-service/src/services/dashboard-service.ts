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

      logger.info('Dashboard created', {
        dashboardId: dashboard.id,
        title: dashboard.title,
        panelCount: dashboard.panels.length,
        tags: dashboard.tags,
      });

      return dashboard;
    } catch (error) {
      logger.error('Failed to create dashboard', error as Error, {
        dashboardData,
      });
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

        logger.info('Dashboard updated', {
          dashboardId,
          title: dashboard.title,
          changes,
        });
      }

      return dashboard;
    } catch (error) {
      logger.error('Failed to update dashboard', error as Error, {
        dashboardId,
        updates,
      });
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
        logger.info('Dashboard deleted', {
          dashboardId,
          title: dashboard.title,
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete dashboard', error as Error, {
        dashboardId,
      });
      throw error;
    }
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      return this.mockDataService.getDashboardById(dashboardId);
    } catch (error) {
      logger.error('Failed to get dashboard', error as Error, {
        dashboardId,
      });
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
      logger.error('Failed to get dashboards', error as Error, {
        filters,
      });
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
        logger.info('Panel added to dashboard', {
          dashboardId,
          panelId: panel.id,
          panelTitle: panel.title,
          panelType: panel.type,
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to add panel to dashboard', error as Error, {
        dashboardId,
        panel,
      });
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
        logger.info('Panel updated in dashboard', {
          dashboardId,
          panelId,
          updates: Object.keys(updates),
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update panel in dashboard', error as Error, {
        dashboardId,
        panelId,
        updates,
      });
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
        logger.info('Panel removed from dashboard', {
          dashboardId,
          panelId,
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to remove panel from dashboard', error as Error, {
        dashboardId,
        panelId,
      });
      throw error;
    }
  }

  async starDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      const updated = await this.updateDashboard(dashboardId, {
        isStarred: true,
      });

      if (updated) {
        logger.info('Dashboard starred', {
          dashboardId,
          title: updated.title,
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to star dashboard', error as Error, {
        dashboardId,
      });
      throw error;
    }
  }

  async unstarDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    try {
      const updated = await this.updateDashboard(dashboardId, {
        isStarred: false,
      });

      if (updated) {
        logger.info('Dashboard unstarred', {
          dashboardId,
          title: updated.title,
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to unstar dashboard', error as Error, {
        dashboardId,
      });
      throw error;
    }
  }

  async duplicateDashboard(dashboardId: string, newTitle?: string): Promise<Dashboard | undefined> {
    try {
      const original = this.mockDataService.getDashboardById(dashboardId);
      if (!original) {
        return undefined;
      }

      const dashboardData: Partial<Dashboard> = {
        title: newTitle || `${original.title} (Copy)`,
        tags: [...original.tags],
        panels: original.panels.map(panel => ({
          ...panel,
          id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
        isStarred: false,
        createdBy: original.createdBy,
      };
      
      if (original.description) {
        dashboardData.description = original.description;
      }
      
      const duplicated = await this.createDashboard(dashboardData);

      logger.info('Dashboard duplicated', {
        originalId: dashboardId,
        duplicatedId: duplicated.id,
        title: duplicated.title,
      });

      return duplicated;
    } catch (error) {
      logger.error('Failed to duplicate dashboard', error as Error, {
        dashboardId,
        newTitle,
      });
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

      logger.info('Dashboard exported', {
        dashboardId,
        title: dashboard.title,
        panelCount: dashboard.panels.length,
      });

      return exportData;
    } catch (error) {
      logger.error('Failed to export dashboard', error as Error, {
        dashboardId,
      });
      throw error;
    }
  }

  async importDashboard(importData: any, _importOptions?: { overwrite?: boolean }): Promise<Dashboard> {
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

      logger.info('Dashboard imported', {
        dashboardId: dashboard.id,
        title: dashboard.title,
        panelCount: panels.length,
      });

      return dashboard;
    } catch (error) {
      logger.error('Failed to import dashboard', error as Error, {
        importData,
      });
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
      logger.error('Failed to get dashboard statistics', error as Error);
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