import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { Metric, MetricRecord } from '../types';

export class MetricsCollectionService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async collectMetric(metricRecord: MetricRecord): Promise<Metric> {
    try {
      // Create metric from record
      const metric = this.mockDataService.addMetric({
        ...metricRecord,
        timestamp: metricRecord.timestamp || new Date(),
      });

      // Publish metric collected event
      await this.eventService.publishMetricCollected(metric);

      logger.info({
        metricId: metric.id,
        name: metric.name,
        value: metric.value,
        type: metric.type,
        service: metric.service,
      }, 'Metric collected');

      return metric;
    } catch (error) {
      logger.error({
        error: error.message,
        metricRecord,
      }, 'Failed to collect metric');
      throw error;
    }
  }

  async updateMetric(metricId: string, value: number): Promise<Metric | undefined> {
    try {
      const metric = this.mockDataService.updateMetric(metricId, {
        value,
        timestamp: new Date(),
      });

      if (metric) {
        await this.eventService.publishMetricCollected(metric);
        
        logger.debug({
          metricId,
          value,
          name: metric.name,
        }, 'Metric updated');
      }

      return metric;
    } catch (error) {
      logger.error({
        error: error.message,
        metricId,
        value,
      }, 'Failed to update metric');
      throw error;
    }
  }

  async getMetricHistory(metricId: string, timeRange: string, resolution: string) {
    try {
      return this.mockDataService.getMetricHistory(metricId, timeRange, resolution);
    } catch (error) {
      logger.error({
        error: error.message,
        metricId,
        timeRange,
        resolution,
      }, 'Failed to get metric history');
      throw error;
    }
  }

  async getMetrics(filters?: { category?: string; service?: string }) {
    try {
      let metrics = this.mockDataService.getMetrics();

      if (filters?.category) {
        metrics = metrics.filter(m => m.category === filters.category);
      }

      if (filters?.service) {
        metrics = metrics.filter(m => m.service === filters.service);
      }

      return metrics;
    } catch (error) {
      logger.error({
        error: error.message,
        filters,
      }, 'Failed to get metrics');
      throw error;
    }
  }

  async getMetricStatistics(metricId: string) {
    try {
      const history = await this.getMetricHistory(metricId, '24h', '5m');
      const values = history.dataPoints.map(dp => dp.value);

      if (values.length === 0) {
        return {
          min: 0,
          max: 0,
          avg: 0,
          count: 0,
          sum: 0,
        };
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const count = values.length;

      return {
        min,
        max,
        avg,
        count,
        sum,
      };
    } catch (error) {
      logger.error({
        error: error.message,
        metricId,
      }, 'Failed to get metric statistics');
      throw error;
    }
  }

  // Bulk operations
  async collectMetricsBatch(metricRecords: MetricRecord[]): Promise<Metric[]> {
    try {
      const metrics: Metric[] = [];
      
      for (const record of metricRecords) {
        const metric = await this.collectMetric(record);
        metrics.push(metric);
      }

      logger.info({
        count: metrics.length,
      }, 'Metrics batch collected');

      return metrics;
    } catch (error) {
      logger.error({
        error: error.message,
        count: metricRecords.length,
      }, 'Failed to collect metrics batch');
      throw error;
    }
  }

  // Aggregation methods
  async getAggregatedMetrics(
    metricName: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    timeRange: string,
    groupBy?: string[]
  ) {
    try {
      const metrics = this.mockDataService.getMetrics()
        .filter(m => m.name === metricName);

      if (metrics.length === 0) {
        return { value: 0, timestamp: new Date() };
      }

      const values = metrics.map(m => m.value);
      let result: number;

      switch (aggregation) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
        case 'count':
          result = values.length;
          break;
        default:
          result = 0;
      }

      return {
        value: result,
        timestamp: new Date(),
        aggregation,
        metricName,
        timeRange,
        groupBy,
      };
    } catch (error) {
      logger.error({
        error: error.message,
        metricName,
        aggregation,
        timeRange,
      }, 'Failed to get aggregated metrics');
      throw error;
    }
  }
}