import { Redis } from 'redis';
import { StoredContract, ContractStatus } from '../types/contract-types';
import { logger } from '@cycletime/shared-utils';

export interface ContractStorageOptions {
  redis?: Redis;
  keyPrefix?: string;
  ttl?: number;
}

export class ContractStorageService {
  private redis: Redis;
  private keyPrefix: string;
  private ttl: number;

  constructor(options: ContractStorageOptions = {}) {
    this.redis = options.redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
    
    this.keyPrefix = options.keyPrefix || 'contract:';
    this.ttl = options.ttl || 60 * 60 * 24 * 7; // 7 days default
  }

  async storeContract(contract: StoredContract): Promise<void> {
    try {
      const key = this.getContractKey(contract.id);
      const serialized = JSON.stringify(this.serializeContract(contract));
      
      await this.redis.setex(key, this.ttl, serialized);
      
      // Also store in contract list for listing operations
      await this.addToContractList(contract);
      
      logger.debug('Contract stored', { contractId: contract.id });
    } catch (error) {
      logger.error('Failed to store contract', { error, contractId: contract.id });
      throw error;
    }
  }

  async getContract(contractId: string): Promise<StoredContract | null> {
    try {
      const key = this.getContractKey(contractId);
      const serialized = await this.redis.get(key);
      
      if (!serialized) {
        return null;
      }
      
      return this.deserializeContract(JSON.parse(serialized));
    } catch (error) {
      logger.error('Failed to get contract', { error, contractId });
      throw error;
    }
  }

  async updateContract(contractId: string, updates: Partial<StoredContract>): Promise<void> {
    try {
      const existing = await this.getContract(contractId);
      
      if (!existing) {
        throw new Error(`Contract not found: ${contractId}`);
      }
      
      const updated = { ...existing, ...updates };
      await this.storeContract(updated);
      
      logger.debug('Contract updated', { contractId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update contract', { error, contractId });
      throw error;
    }
  }

  async updateContractStatus(contractId: string, status: ContractStatus, progress?: number): Promise<void> {
    const updates: Partial<StoredContract> = { status };
    
    if (progress !== undefined) {
      updates.progress = progress;
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }
    
    await this.updateContract(contractId, updates);
  }

  async updateContractProgress(contractId: string, progress: number): Promise<void> {
    await this.updateContract(contractId, { progress });
  }

  async deleteContract(contractId: string): Promise<void> {
    try {
      const key = this.getContractKey(contractId);
      await this.redis.del(key);
      
      // Remove from contract list
      await this.removeFromContractList(contractId);
      
      logger.debug('Contract deleted', { contractId });
    } catch (error) {
      logger.error('Failed to delete contract', { error, contractId });
      throw error;
    }
  }

  async listContracts(options: {
    serviceName?: string;
    serviceType?: string;
    status?: ContractStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ contracts: StoredContract[]; total: number }> {
    try {
      const { limit = 50, offset = 0 } = options;
      
      // Get contract IDs from the list
      const contractIds = await this.getContractList();
      
      // Filter and paginate
      const filteredIds = await this.filterContractIds(contractIds, options);
      const paginatedIds = filteredIds.slice(offset, offset + limit);
      
      // Get full contract data
      const contracts = await Promise.all(
        paginatedIds.map(id => this.getContract(id))
      );
      
      // Filter out null values
      const validContracts = contracts.filter(contract => contract !== null) as StoredContract[];
      
      return {
        contracts: validContracts,
        total: filteredIds.length,
      };
    } catch (error) {
      logger.error('Failed to list contracts', { error, options });
      throw error;
    }
  }

  async getContractsByStatus(status: ContractStatus): Promise<StoredContract[]> {
    const result = await this.listContracts({ status, limit: 1000 });
    return result.contracts;
  }

  async getContractsByService(serviceName: string): Promise<StoredContract[]> {
    const result = await this.listContracts({ serviceName, limit: 1000 });
    return result.contracts;
  }

  async cleanup(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Contract storage service cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup contract storage service', { error });
    }
  }

  private getContractKey(contractId: string): string {
    return `${this.keyPrefix}${contractId}`;
  }

  private getContractListKey(): string {
    return `${this.keyPrefix}list`;
  }

  private async addToContractList(contract: StoredContract): Promise<void> {
    const listKey = this.getContractListKey();
    const contractInfo = {
      id: contract.id,
      serviceName: contract.serviceName,
      serviceType: contract.serviceType,
      status: contract.status,
      createdAt: contract.createdAt.toISOString(),
    };
    
    await this.redis.lpush(listKey, JSON.stringify(contractInfo));
  }

  private async removeFromContractList(contractId: string): Promise<void> {
    const listKey = this.getContractListKey();
    const allItems = await this.redis.lrange(listKey, 0, -1);
    
    // Find and remove the item
    for (const item of allItems) {
      try {
        const parsed = JSON.parse(item);
        if (parsed.id === contractId) {
          await this.redis.lrem(listKey, 1, item);
          break;
        }
      } catch (error) {
        logger.warn('Failed to parse contract list item', { error, item });
      }
    }
  }

  private async getContractList(): Promise<string[]> {
    const listKey = this.getContractListKey();
    const items = await this.redis.lrange(listKey, 0, -1);
    
    return items
      .map(item => {
        try {
          return JSON.parse(item).id;
        } catch (error) {
          logger.warn('Failed to parse contract list item', { error, item });
          return null;
        }
      })
      .filter(id => id !== null);
  }

  private async filterContractIds(
    contractIds: string[],
    options: {
      serviceName?: string;
      serviceType?: string;
      status?: ContractStatus;
    }
  ): Promise<string[]> {
    if (!options.serviceName && !options.serviceType && !options.status) {
      return contractIds;
    }

    const filtered: string[] = [];
    
    for (const contractId of contractIds) {
      const contract = await this.getContract(contractId);
      
      if (!contract) continue;
      
      let matches = true;
      
      if (options.serviceName && contract.serviceName !== options.serviceName) {
        matches = false;
      }
      
      if (options.serviceType && contract.serviceType !== options.serviceType) {
        matches = false;
      }
      
      if (options.status && contract.status !== options.status) {
        matches = false;
      }
      
      if (matches) {
        filtered.push(contractId);
      }
    }
    
    return filtered;
  }

  private serializeContract(contract: StoredContract): any {
    return {
      ...contract,
      createdAt: contract.createdAt.toISOString(),
      completedAt: contract.completedAt?.toISOString(),
    };
  }

  private deserializeContract(data: any): StoredContract {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    };
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          details: { responseTime, message: 'Redis response time is high' },
        };
      }
      
      return {
        status: 'healthy',
        details: { responseTime },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}