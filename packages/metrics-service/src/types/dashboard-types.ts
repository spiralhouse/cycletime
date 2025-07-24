export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  panels: DashboardPanel[];
  isStarred: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'pie' | 'bar';
  metrics: string[];
  timeRange: string;
  refreshInterval?: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  options: Record<string, any>;
  fieldConfig: Record<string, any>;
}

export interface DashboardSummary {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  panelCount: number;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  panels: DashboardPanel[];
  variables: DashboardVariable[];
  tags: string[];
}

export interface DashboardVariable {
  name: string;
  type: 'query' | 'custom' | 'constant' | 'datasource';
  query?: string;
  options?: Array<{
    text: string;
    value: string;
  }>;
  current?: {
    text: string;
    value: string;
  };
  includeAll?: boolean;
  multi?: boolean;
}