import { 
  ContractGenerationRequest, 
  ContractGenerationResponse, 
  ContractStatusResponse,
  ContractSpecification,
  StoredContract,
  ContractStatus,
  ContractGeneratedEvent,
  ContractFailedEvent
} from '../types/contract-types';
import { ContractGenerator } from '../utils/contract-generator';
import { ContractStorageService } from './contract-storage-service';
import { ValidationService } from './validation-service';
import { EventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

export class ContractGenerationService {
  private contractStorage: ContractStorageService;
  private validationService: ValidationService;
  private eventService: EventService;

  constructor(
    contractStorage: ContractStorageService,
    validationService: ValidationService,
    eventService: EventService
  ) {
    this.contractStorage = contractStorage;
    this.validationService = validationService;
    this.eventService = eventService;
  }

  async generateContract(request: ContractGenerationRequest): Promise<ContractGenerationResponse> {
    const contractId = this.generateContractId();
    
    try {
      logger.info('Starting contract generation', { contractId, serviceName: request.serviceName });

      // Create initial contract record
      const contract: StoredContract = {
        id: contractId,
        serviceName: request.serviceName,
        serviceType: request.serviceType,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        stages: [],
        originalRequest: request,
      };

      // Store contract
      await this.contractStorage.storeContract(contract);

      // Start async generation process
      this.generateContractAsync(contractId, request).catch(error => {
        logger.error('Async contract generation failed' + ": " + error.message);
      });

      return {
        contractId,
        status: 'pending',
        estimatedCompletion: this.calculateEstimatedCompletion(),
        message: 'Contract generation started',
      };
    } catch (error) {
      logger.error('Contract generation failed' + ": " + error.message);
      throw error;
    }
  }

  private async generateContractAsync(contractId: string, request: ContractGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      await this.contractStorage.updateContractStatus(contractId, 'processing', 10);

      // Generate contract
      const generator = new ContractGenerator(request);
      const specification = await generator.generateContract();

      // Update progress
      await this.contractStorage.updateContractProgress(contractId, 60);

      // Validate contract if enabled
      if (request.options?.validateOutput) {
        logger.info('Validating generated contract', { contractId });
        
        if (specification.openapi) {
          const validationResult = await this.validationService.validateContract(specification.openapi);
          
          if (!validationResult.valid) {
            logger.warn('Contract validation failed', { 
              contractId, 
              errors: validationResult.errors 
            });
            
            // Still save the contract but mark validation issues
            specification.metadata = {
              ...specification.metadata,
              validationScore: validationResult.score,
              validationErrors: validationResult.errors,
            } as any;
          }
        }
      }

      // Update progress
      await this.contractStorage.updateContractProgress(contractId, 80);

      // Store final contract
      await this.contractStorage.updateContract(contractId, {
        specification: {
          openapi: specification.openapi as any,
          asyncapi: specification.asyncapi as any,
          boundaries: specification.boundaries,
        },
        metadata: specification.metadata,
        stages: generator.getStages(),
      });

      // Mark as completed
      await this.contractStorage.updateContractStatus(contractId, 'completed', 100);

      logger.info('Contract generation completed', { contractId, serviceName: request.serviceName });

      // Publish contract generated event
      const event: ContractGeneratedEvent = {
        contractId,
        serviceName: request.serviceName,
        serviceType: request.serviceType,
        openapi: specification.openapi as any,
        asyncapi: specification.asyncapi,
        boundaries: specification.boundaries,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Contract Generation Engine',
        metadata: specification.metadata,
      };

      await this.eventService.publishContractGenerated(event);

    } catch (error) {
      logger.error('Contract generation failed' + ": " + error.message);

      // Update status to failed
      await this.contractStorage.updateContract(contractId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });

      // Publish contract failed event
      const failedEvent: ContractFailedEvent = {
        contractId,
        serviceName: request.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'GENERATION_FAILED',
        stage: 'generation',
        details: error.message,
        failedAt: new Date().toISOString(),
        retryable: true,
        retryCount: 0,
      };

      await this.eventService.publishContractFailed(failedEvent);
    }
  }

  async getContractStatus(contractId: string): Promise<ContractStatusResponse> {
    const contract = await this.contractStorage.getContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    return {
      contractId: contract.id,
      status: contract.status,
      progress: contract.progress,
      createdAt: contract.createdAt.toISOString(),
      completedAt: contract.completedAt?.toISOString(),
      error: contract.error,
      stages: contract.stages,
    };
  }

  async getContractSpecification(contractId: string, format?: 'openapi' | 'asyncapi' | 'combined'): Promise<ContractSpecification> {
    const contract = await this.contractStorage.getContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    if (contract.status !== 'completed') {
      throw new Error(`Contract is not completed: ${contract.status}`);
    }

    const specification: ContractSpecification = {
      contractId: contract.id,
      serviceName: contract.serviceName,
      metadata: contract.metadata,
    };

    // Add requested specifications
    if (!format || format === 'combined' || format === 'openapi') {
      specification.openapi = contract.specification?.openapi;
    }

    if (!format || format === 'combined' || format === 'asyncapi') {
      specification.asyncapi = contract.specification?.asyncapi;
    }

    if (!format || format === 'combined') {
      specification.boundaries = contract.specification?.boundaries;
    }

    return specification;
  }

  async validateContract(contractId: string, options?: any): Promise<any> {
    const contract = await this.contractStorage.getContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    const results: any = {
      contractId,
      validationResults: [],
    };

    // Validate OpenAPI specification
    if (contract.specification?.openapi) {
      const openApiResult = await this.validationService.validateContract(
        contract.specification.openapi,
        options
      );
      results.validationResults.push({
        type: 'openapi',
        result: openApiResult,
      });
    }

    // Validate AsyncAPI specification
    if (contract.specification?.asyncapi) {
      const asyncApiResult = await this.validationService.validateAsyncAPI(
        contract.specification.asyncapi,
        options
      );
      results.validationResults.push({
        type: 'asyncapi',
        result: asyncApiResult,
      });
    }

    // Update contract with validation results
    await this.contractStorage.updateContract(contractId, {
      metadata: {
        ...contract.metadata,
        lastValidated: new Date().toISOString(),
        validationResults: results.validationResults,
      } as any,
    });

    return results;
  }

  async refineContract(contractId: string, refinements: any): Promise<any> {
    const contract = await this.contractStorage.getContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    if (contract.status !== 'completed') {
      throw new Error(`Contract is not completed: ${contract.status}`);
    }

    logger.info('Refining contract', { contractId, refinements });

    try {
      // Apply refinements to the contract
      const updatedSpecification = await this.applyRefinements(
        contract.specification,
        refinements
      );

      // Validate refined contract
      let validationResults: any = {};
      if (updatedSpecification.openapi) {
        validationResults.openapi = await this.validationService.validateContract(
          updatedSpecification.openapi
        );
      }

      // Update contract
      await this.contractStorage.updateContract(contractId, {
        specification: updatedSpecification,
        metadata: {
          ...contract.metadata,
          lastRefined: new Date().toISOString(),
          refinementHistory: [
            ...(contract.metadata as any)?.refinementHistory || [],
            {
              appliedAt: new Date().toISOString(),
              refinements,
              validationResults,
            },
          ],
        } as any,
      });

      return {
        contractId,
        applied: refinements.length,
        skipped: 0,
        errors: [],
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Contract refinement failed' + ": " + error.message);
      throw error;
    }
  }

  async deleteContract(contractId: string): Promise<void> {
    const contract = await this.contractStorage.getContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    await this.contractStorage.deleteContract(contractId);
    
    logger.info('Contract deleted', { contractId });
  }

  async listContracts(options?: {
    serviceName?: string;
    serviceType?: string;
    status?: ContractStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ contracts: StoredContract[]; total: number }> {
    return await this.contractStorage.listContracts(options);
  }

  private async applyRefinements(specification: any, refinements: any): Promise<any> {
    // This is a simplified implementation
    // In practice, you would have more sophisticated refinement logic
    const updated = { ...specification };

    for (const refinement of refinements) {
      switch (refinement.type) {
        case 'add-endpoint':
          // Add endpoint logic
          break;
        case 'modify-endpoint':
          // Modify endpoint logic
          break;
        case 'remove-endpoint':
          // Remove endpoint logic
          break;
        case 'add-event':
          // Add event logic
          break;
        case 'modify-event':
          // Modify event logic
          break;
        case 'remove-event':
          // Remove event logic
          break;
        case 'update-schema':
          // Update schema logic
          break;
        default:
          logger.warn('Unknown refinement type', { type: refinement.type });
      }
    }

    return updated;
  }

  private generateContractId(): string {
    return `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateEstimatedCompletion(): string {
    // Estimate 30 seconds for contract generation
    const estimatedTime = new Date(Date.now() + 30000);
    return estimatedTime.toISOString();
  }
}