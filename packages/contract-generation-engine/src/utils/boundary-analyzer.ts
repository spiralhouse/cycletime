import { 
  BoundaryAnalysisRequest,
  BoundaryAnalysisResponse,
  BoundaryAnalysisContext,
  BoundaryRecommendation,
  BOUNDARY_PATTERNS,
  INTERACTION_TYPES,
  DataFlowAnalysis,
  PerformanceAnalysis
} from '../types/boundary-types';
import { ServiceBoundary, ServiceInteraction } from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export class BoundaryAnalyzer {
  private context: BoundaryAnalysisContext;

  constructor(request: BoundaryAnalysisRequest) {
    this.context = {
      analysisId: this.generateAnalysisId(),
      requestedServices: request.services,
      architecture: request.architecture,
      requirements: request.requirements,
      options: request.options || {
        includeDataFlow: true,
        includeSecurityBoundaries: true,
        includePerformanceRequirements: false,
      },
      timestamp: new Date(),
    };
  }

  async analyzeSystemBoundaries(): Promise<BoundaryAnalysisResponse> {
    try {
      // Analyze service boundaries
      const services = await this.analyzeServices();
      
      // Analyze service interactions
      const interactions = await this.analyzeInteractions(services);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(services, interactions);
      
      return {
        analysisId: this.context.analysisId,
        services,
        interactions,
        recommendations,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Boundary analysis failed', { error, context: this.context });
      throw error;
    }
  }

  private async analyzeServices(): Promise<ServiceBoundary[]> {
    const services: ServiceBoundary[] = [];

    for (const serviceName of this.context.requestedServices) {
      const boundary = await this.analyzeService(serviceName);
      services.push(boundary);
    }

    return services;
  }

  private async analyzeService(serviceName: string): Promise<ServiceBoundary> {
    // Extract service characteristics from requirements and architecture
    const responsibilities = this.extractResponsibilities(serviceName);
    const dataOwnership = this.extractDataOwnership(serviceName);
    const securityScope = this.determineSecurityScope(serviceName);
    const scalingCharacteristics = this.analyzeScalingCharacteristics(serviceName);

    return {
      service: serviceName,
      responsibilities,
      dataOwnership,
      securityScope,
      scalingCharacteristics,
    };
  }

  private extractResponsibilities(serviceName: string): string[] {
    const commonResponsibilities: Record<string, string[]> = {
      'user-service': [
        'User authentication and authorization',
        'User profile management',
        'User session management',
        'User preferences and settings',
      ],
      'order-service': [
        'Order creation and management',
        'Order status tracking',
        'Order history and reporting',
        'Order validation and processing',
      ],
      'payment-service': [
        'Payment processing',
        'Payment method management',
        'Transaction history',
        'Refund and chargeback handling',
      ],
      'inventory-service': [
        'Product catalog management',
        'Stock level tracking',
        'Inventory alerts and notifications',
        'Supplier management',
      ],
      'notification-service': [
        'Email notifications',
        'SMS notifications',
        'Push notifications',
        'Notification templates and preferences',
      ],
    };

    // Check for exact match
    if (commonResponsibilities[serviceName.toLowerCase()]) {
      return commonResponsibilities[serviceName.toLowerCase()];
    }

    // Check for partial matches
    for (const [key, responsibilities] of Object.entries(commonResponsibilities)) {
      if (serviceName.toLowerCase().includes(key.split('-')[0])) {
        return responsibilities;
      }
    }

    // Default responsibilities based on service name analysis
    const defaultResponsibilities = [
      `${serviceName} business logic`,
      `${serviceName} data management`,
      `${serviceName} API endpoints`,
      `${serviceName} validation and processing`,
    ];

    return defaultResponsibilities;
  }

  private extractDataOwnership(serviceName: string): string[] {
    const dataOwnership: Record<string, string[]> = {
      'user-service': ['User profiles', 'Authentication tokens', 'User preferences'],
      'order-service': ['Order records', 'Order items', 'Order history'],
      'payment-service': ['Payment records', 'Transaction logs', 'Payment methods'],
      'inventory-service': ['Product catalog', 'Stock levels', 'Supplier information'],
      'notification-service': ['Notification logs', 'Templates', 'Delivery status'],
    };

    // Check for exact match
    if (dataOwnership[serviceName.toLowerCase()]) {
      return dataOwnership[serviceName.toLowerCase()];
    }

    // Check for partial matches
    for (const [key, data] of Object.entries(dataOwnership)) {
      if (serviceName.toLowerCase().includes(key.split('-')[0])) {
        return data;
      }
    }

    // Default data ownership
    return [`${serviceName} data`, `${serviceName} metadata`];
  }

  private determineSecurityScope(serviceName: string): 'public' | 'internal' | 'restricted' | 'private' {
    const publicServices = ['gateway', 'api', 'web', 'frontend'];
    const restrictedServices = ['auth', 'payment', 'billing', 'admin'];
    const privateServices = ['database', 'cache', 'queue', 'storage'];

    const name = serviceName.toLowerCase();

    if (publicServices.some(s => name.includes(s))) {
      return 'public';
    }

    if (restrictedServices.some(s => name.includes(s))) {
      return 'restricted';
    }

    if (privateServices.some(s => name.includes(s))) {
      return 'private';
    }

    return 'internal';
  }

  private analyzeScalingCharacteristics(serviceName: string) {
    const characteristics = {
      pattern: 'mixed' as const,
      expectedLoad: 'medium' as const,
    };

    const name = serviceName.toLowerCase();

    // CPU-bound services
    if (name.includes('compute') || name.includes('calculate') || name.includes('process')) {
      characteristics.pattern = 'cpu-bound';
    }

    // IO-bound services
    if (name.includes('database') || name.includes('storage') || name.includes('file')) {
      characteristics.pattern = 'io-bound';
    }

    // Memory-bound services
    if (name.includes('cache') || name.includes('memory') || name.includes('buffer')) {
      characteristics.pattern = 'memory-bound';
    }

    // High-load services
    if (name.includes('gateway') || name.includes('proxy') || name.includes('load')) {
      characteristics.expectedLoad = 'high';
    }

    // Low-load services
    if (name.includes('admin') || name.includes('config') || name.includes('setup')) {
      characteristics.expectedLoad = 'low';
    }

    return characteristics;
  }

  private async analyzeInteractions(services: ServiceBoundary[]): Promise<ServiceInteraction[]> {
    const interactions: ServiceInteraction[] = [];

    // Analyze interactions between services
    for (let i = 0; i < services.length; i++) {
      for (let j = i + 1; j < services.length; j++) {
        const fromService = services[i];
        const toService = services[j];

        // Determine interaction type based on service characteristics
        const interaction = this.determineInteraction(fromService, toService);
        if (interaction) {
          interactions.push(interaction);
        }

        // Check reverse interaction
        const reverseInteraction = this.determineInteraction(toService, fromService);
        if (reverseInteraction) {
          interactions.push(reverseInteraction);
        }
      }
    }

    return interactions;
  }

  private determineInteraction(
    fromService: ServiceBoundary,
    toService: ServiceBoundary
  ): ServiceInteraction | null {
    // Common interaction patterns
    const patterns = [
      {
        from: 'api',
        to: 'auth',
        type: 'synchronous' as const,
        protocol: 'HTTP',
        frequency: 'frequent' as const,
        consistency: 'strong' as const,
      },
      {
        from: 'order',
        to: 'payment',
        type: 'synchronous' as const,
        protocol: 'HTTP',
        frequency: 'frequent' as const,
        consistency: 'strong' as const,
      },
      {
        from: 'order',
        to: 'inventory',
        type: 'synchronous' as const,
        protocol: 'HTTP',
        frequency: 'frequent' as const,
        consistency: 'strong' as const,
      },
      {
        from: 'notification',
        to: 'user',
        type: 'asynchronous' as const,
        protocol: 'Message Queue',
        frequency: 'frequent' as const,
        consistency: 'eventual' as const,
      },
    ];

    // Check for matching patterns
    for (const pattern of patterns) {
      if (
        fromService.service.toLowerCase().includes(pattern.from) &&
        toService.service.toLowerCase().includes(pattern.to)
      ) {
        return {
          from: fromService.service,
          to: toService.service,
          type: pattern.type,
          protocol: pattern.protocol,
          dataFlow: `${fromService.service} -> ${toService.service}`,
          frequency: pattern.frequency,
          consistency: pattern.consistency,
        };
      }
    }

    // Default interaction if services seem related
    if (this.areServicesRelated(fromService, toService)) {
      return {
        from: fromService.service,
        to: toService.service,
        type: 'synchronous',
        protocol: 'HTTP',
        dataFlow: `${fromService.service} -> ${toService.service}`,
        frequency: 'occasional',
        consistency: 'eventual',
      };
    }

    return null;
  }

  private areServicesRelated(service1: ServiceBoundary, service2: ServiceBoundary): boolean {
    // Check if services share common responsibilities or data
    const responsibilities1 = service1.responsibilities.join(' ').toLowerCase();
    const responsibilities2 = service2.responsibilities.join(' ').toLowerCase();

    // Look for common terms
    const commonTerms = ['user', 'order', 'payment', 'product', 'inventory'];
    
    for (const term of commonTerms) {
      if (responsibilities1.includes(term) && responsibilities2.includes(term)) {
        return true;
      }
    }

    // Check data ownership overlap
    if (service1.dataOwnership && service2.dataOwnership) {
      const data1 = service1.dataOwnership.join(' ').toLowerCase();
      const data2 = service2.dataOwnership.join(' ').toLowerCase();

      for (const term of commonTerms) {
        if (data1.includes(term) && data2.includes(term)) {
          return true;
        }
      }
    }

    return false;
  }

  private async generateRecommendations(
    services: ServiceBoundary[],
    interactions: ServiceInteraction[]
  ): Promise<BoundaryRecommendation[]> {
    const recommendations: BoundaryRecommendation[] = [];

    // Analyze service coupling
    const couplingAnalysis = this.analyzeCoupling(services, interactions);
    recommendations.push(...couplingAnalysis);

    // Analyze data flow
    const dataFlowAnalysis = this.analyzeDataFlow(services, interactions);
    recommendations.push(...dataFlowAnalysis);

    // Analyze performance requirements
    if (this.context.options.includePerformanceRequirements) {
      const performanceAnalysis = this.analyzePerformance(services, interactions);
      recommendations.push(...performanceAnalysis);
    }

    return recommendations;
  }

  private analyzeCoupling(
    services: ServiceBoundary[],
    interactions: ServiceInteraction[]
  ): BoundaryRecommendation[] {
    const recommendations: BoundaryRecommendation[] = [];

    // Check for highly coupled services
    const interactionCounts = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const key = `${interaction.from}-${interaction.to}`;
      interactionCounts.set(key, (interactionCounts.get(key) || 0) + 1);
    });

    // Find services with high coupling
    interactionCounts.forEach((count, key) => {
      if (count > 3) {
        const [from, to] = key.split('-');
        recommendations.push({
          type: 'merge-services',
          description: `Consider merging ${from} and ${to} services due to high coupling`,
          rationale: `These services have ${count} interactions, indicating tight coupling`,
          impact: 'medium',
          effort: 'high',
        });
      }
    });

    // Check for services with no interactions
    const connectedServices = new Set<string>();
    interactions.forEach(interaction => {
      connectedServices.add(interaction.from);
      connectedServices.add(interaction.to);
    });

    services.forEach(service => {
      if (!connectedServices.has(service.service)) {
        recommendations.push({
          type: 'split-service',
          description: `${service.service} appears isolated and may need better integration`,
          rationale: 'Service has no identified interactions with other services',
          impact: 'low',
          effort: 'medium',
        });
      }
    });

    return recommendations;
  }

  private analyzeDataFlow(
    services: ServiceBoundary[],
    interactions: ServiceInteraction[]
  ): BoundaryRecommendation[] {
    const recommendations: BoundaryRecommendation[] = [];

    // Check for synchronous interactions that could be asynchronous
    interactions.forEach(interaction => {
      if (interaction.type === 'synchronous' && interaction.frequency === 'frequent') {
        recommendations.push({
          type: 'add-cache',
          description: `Consider adding caching between ${interaction.from} and ${interaction.to}`,
          rationale: 'Frequent synchronous interactions can benefit from caching',
          impact: 'medium',
          effort: 'low',
        });
      }
    });

    // Check for public services that might need a gateway
    const publicServices = services.filter(s => s.securityScope === 'public');
    if (publicServices.length > 2) {
      recommendations.push({
        type: 'add-gateway',
        description: 'Consider adding an API gateway for public services',
        rationale: `Multiple public services (${publicServices.length}) can benefit from centralized routing`,
        impact: 'high',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  private analyzePerformance(
    services: ServiceBoundary[],
    interactions: ServiceInteraction[]
  ): BoundaryRecommendation[] {
    const recommendations: BoundaryRecommendation[] = [];

    // Check for high-load services
    const highLoadServices = services.filter(s => 
      s.scalingCharacteristics?.expectedLoad === 'high'
    );

    highLoadServices.forEach(service => {
      recommendations.push({
        type: 'extract-shared-component',
        description: `Consider extracting shared components from ${service.service}`,
        rationale: 'High-load services benefit from component extraction for better scaling',
        impact: 'high',
        effort: 'high',
      });
    });

    return recommendations;
  }

  private generateAnalysisId(): string {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async generateDataFlowAnalysis(serviceName: string): Promise<DataFlowAnalysis> {
    return {
      serviceId: serviceName,
      incomingDataTypes: ['HTTP Requests', 'Event Messages', 'Database Queries'],
      outgoingDataTypes: ['HTTP Responses', 'Event Publications', 'Database Updates'],
      dataTransformations: ['Input Validation', 'Business Logic', 'Output Formatting'],
      dataStorage: ['Database Tables', 'Cache Entries', 'File Storage'],
      dataRetention: ['30 days for logs', '1 year for transactions', 'Indefinite for user data'],
      dataSensitivity: 'internal',
    };
  }

  async generatePerformanceAnalysis(serviceName: string): Promise<PerformanceAnalysis> {
    return {
      serviceId: serviceName,
      expectedThroughput: 1000, // requests per second
      expectedLatency: 100, // milliseconds
      scalingRequirements: ['Horizontal scaling', 'Auto-scaling', 'Load balancing'],
      resourceRequirements: {
        cpu: '2 cores',
        memory: '4 GB',
        storage: '50 GB',
        network: '1 Gbps',
      },
      bottlenecks: ['Database queries', 'External API calls', 'Memory allocation'],
    };
  }
}