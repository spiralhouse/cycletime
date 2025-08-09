/**
 * Component status tracking for MCP server components
 */

/**
 * Component status types
 */
export type ComponentStatusType =
  | 'initializing'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'unknown';

/**
 * Component status information
 */
export interface ComponentStatusInfo {
  /** Current status of the component */
  status: ComponentStatusType;
  /** Timestamp when status was last updated */
  timestamp: number;
  /** Optional metadata about the component */
  metadata?: Record<string, unknown>;
  /** Error information if status is 'error' */
  error?: string;
}

/**
 * Component status tracking system
 */
export class ComponentStatus {
  private statuses = new Map<string, ComponentStatusInfo>();

  /**
   * Set the status of a component
   */
  setStatus(
    componentName: string,
    status: ComponentStatusType,
    metadata?: Record<string, unknown>,
    error?: string
  ): void {
    const statusInfo: ComponentStatusInfo = {
      status,
      timestamp: Date.now(),
    };

    if (metadata) {
      statusInfo.metadata = metadata;
    }

    if (error) {
      statusInfo.error = error;
    }

    this.statuses.set(componentName, statusInfo);
  }

  /**
   * Get the status of a specific component
   */
  getStatus(componentName: string): ComponentStatusInfo | undefined {
    return this.statuses.get(componentName);
  }

  /**
   * Get all component statuses
   */
  getAllStatuses(): Record<string, ComponentStatusInfo> {
    const result: Record<string, ComponentStatusInfo> = {};

    for (const [name, status] of this.statuses.entries()) {
      result[name] = status;
    }

    return result;
  }

  /**
   * Remove a component from status tracking
   */
  removeComponent(componentName: string): void {
    this.statuses.delete(componentName);
  }

  /**
   * Get components filtered by status
   */
  getComponentsByStatus(status: ComponentStatusType): string[] {
    const components: string[] = [];

    for (const [name, info] of this.statuses.entries()) {
      if (info.status === status) {
        components.push(name);
      }
    }

    return components;
  }

  /**
   * Check if any component has an error status
   */
  hasErrors(): boolean {
    for (const [, info] of this.statuses.entries()) {
      if (info.status === 'error') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get count of components by status
   */
  getStatusCounts(): Record<ComponentStatusType, number> {
    const counts: Record<ComponentStatusType, number> = {
      initializing: 0,
      running: 0,
      stopping: 0,
      stopped: 0,
      error: 0,
      unknown: 0,
    };

    for (const [, info] of this.statuses.entries()) {
      counts[info.status]++;
    }

    return counts;
  }

  /**
   * Clear all component statuses
   */
  clear(): void {
    this.statuses.clear();
  }

  /**
   * Get list of all tracked component names
   */
  getComponentNames(): string[] {
    return Array.from(this.statuses.keys());
  }

  /**
   * Check if all components are in running state
   */
  allRunning(): boolean {
    if (this.statuses.size === 0) {
      return false;
    }

    for (const [, info] of this.statuses.entries()) {
      if (info.status !== 'running') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if any component is in stopping or stopped state
   */
  anyStopping(): boolean {
    for (const [, info] of this.statuses.entries()) {
      if (info.status === 'stopping' || info.status === 'stopped') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get health summary of all components
   */
  getHealthSummary(): {
    totalComponents: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  } {
    const total = this.statuses.size;
    let healthy = 0;
    let unhealthy = 0;
    let unknown = 0;

    for (const [, info] of this.statuses.entries()) {
      switch (info.status) {
        case 'running':
          healthy++;
          break;

        case 'error':
        case 'stopped':
          unhealthy++;

          break;

        case 'unknown':
        case 'initializing':
        case 'stopping':
        default:
          unknown++;

          break;
      }
    }

    return {
      totalComponents: total,
      healthy,
      unhealthy,
      unknown,
    };
  }
}
