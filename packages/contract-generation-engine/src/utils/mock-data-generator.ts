import { OpenAPIV3 } from 'openapi-types';
import { logger } from '@cycletime/shared-utils';

export interface MockDataOptions {
  includeOptionalFields: boolean;
  generateArrays: boolean;
  arrayMinLength: number;
  arrayMaxLength: number;
  useRealisticData: boolean;
  locale: string;
}

export class MockDataGenerator {
  private options: MockDataOptions;
  private readonly realisticData: Record<string, any>;

  constructor(options: Partial<MockDataOptions> = {}) {
    this.options = {
      includeOptionalFields: true,
      generateArrays: true,
      arrayMinLength: 1,
      arrayMaxLength: 3,
      useRealisticData: true,
      locale: 'en',
      ...options,
    };

    this.realisticData = {
      names: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'],
      emails: ['john@example.com', 'jane@example.com', 'bob@example.com', 'alice@example.com', 'charlie@example.com'],
      companies: ['Acme Corp', 'Tech Solutions', 'Digital Innovations', 'Global Systems', 'Future Tech'],
      cities: ['New York', 'London', 'Tokyo', 'Paris', 'Sydney'],
      countries: ['United States', 'United Kingdom', 'Japan', 'France', 'Australia'],
      currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD'],
      statuses: ['active', 'inactive', 'pending', 'completed', 'cancelled'],
      priorities: ['low', 'medium', 'high', 'urgent'],
      categories: ['electronics', 'clothing', 'books', 'home', 'sports'],
      descriptions: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa.',
      ],
    };
  }

  async generateMockResponse(
    operation: OpenAPIV3.OperationObject,
    path: string,
    method: string
  ): Promise<any> {
    try {
      // Get the success response schema
      const successResponse = this.getSuccessResponse(operation);
      if (!successResponse) {
        return this.generateDefaultResponse(operation, path, method);
      }

      // Generate mock data from schema
      const mockData = await this.generateFromSchema(successResponse);
      
      return {
        success: true,
        data: mockData,
        timestamp: new Date().toISOString(),
        requestId: this.generateId(),
      };
    } catch (error) {
      logger.error('Mock data generation failed' + ": " + error.message);
      return this.generateDefaultResponse(operation, path, method);
    }
  }

  private getSuccessResponse(operation: OpenAPIV3.OperationObject): OpenAPIV3.SchemaObject | null {
    if (!operation.responses) return null;

    // Try to find 200, 201, or first 2xx response
    const successCodes = ['200', '201', '202', '204'];
    
    for (const code of successCodes) {
      const response = operation.responses[code];
      if (response && typeof response === 'object' && 'content' in response) {
        const responseObj = response as OpenAPIV3.ResponseObject;
        if (responseObj.content && responseObj.content['application/json']) {
          return responseObj.content['application/json'].schema as OpenAPIV3.SchemaObject;
        }
      }
    }

    // Try to find any 2xx response
    for (const [code, response] of Object.entries(operation.responses)) {
      if (code.startsWith('2') && typeof response === 'object' && 'content' in response) {
        const responseObj = response as OpenAPIV3.ResponseObject;
        if (responseObj.content && responseObj.content['application/json']) {
          return responseObj.content['application/json'].schema as OpenAPIV3.SchemaObject;
        }
      }
    }

    return null;
  }

  private generateDefaultResponse(operation: OpenAPIV3.OperationObject, path: string, method: string): any {
    const methodLower = method.toLowerCase();
    
    switch (methodLower) {
      case 'get':
        if (path.includes('{')) {
          // Single resource
          return {
            success: true,
            data: {
              id: this.generateId(),
              name: this.getRandomValue('names'),
              description: this.getRandomValue('descriptions'),
              createdAt: this.generateTimestamp(),
              updatedAt: this.generateTimestamp(),
            },
            timestamp: new Date().toISOString(),
          };
        } else {
          // List of resources
          return {
            success: true,
            data: this.generateArray(() => ({
              id: this.generateId(),
              name: this.getRandomValue('names'),
              description: this.getRandomValue('descriptions'),
              createdAt: this.generateTimestamp(),
              updatedAt: this.generateTimestamp(),
            })),
            pagination: {
              page: 1,
              limit: 10,
              total: 100,
              totalPages: 10,
            },
            timestamp: new Date().toISOString(),
          };
        }
      
      case 'post':
        return {
          success: true,
          data: {
            id: this.generateId(),
            message: 'Resource created successfully',
            createdAt: this.generateTimestamp(),
          },
          timestamp: new Date().toISOString(),
        };
      
      case 'put':
      case 'patch':
        return {
          success: true,
          data: {
            id: this.generateId(),
            message: 'Resource updated successfully',
            updatedAt: this.generateTimestamp(),
          },
          timestamp: new Date().toISOString(),
        };
      
      case 'delete':
        return {
          success: true,
          data: {
            message: 'Resource deleted successfully',
            deletedAt: this.generateTimestamp(),
          },
          timestamp: new Date().toISOString(),
        };
      
      default:
        return {
          success: true,
          data: {},
          timestamp: new Date().toISOString(),
        };
    }
  }

  async generateFromSchema(schema: OpenAPIV3.SchemaObject): Promise<any> {
    if (!schema) return null;

    // Handle references
    if ('$ref' in schema) {
      // In a real implementation, you would resolve the reference
      logger.warn('Schema references are not fully supported in mock generator');
      return { ref: schema.$ref };
    }

    // Handle different schema types
    switch (schema.type) {
      case 'object':
        return this.generateObject(schema);
      case 'array':
        return this.generateArray(() => this.generateFromSchema(schema.items as OpenAPIV3.SchemaObject));
      case 'string':
        return this.generateString(schema);
      case 'number':
      case 'integer':
        return this.generateNumber(schema);
      case 'boolean':
        return this.generateBoolean(schema);
      default:
        return this.generateByFormat(schema);
    }
  }

  private generateObject(schema: OpenAPIV3.SchemaObject): any {
    const obj: any = {};

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(key) || false;
        const shouldInclude = isRequired || (this.options.includeOptionalFields && Math.random() > 0.3);

        if (shouldInclude) {
          obj[key] = this.generateFromSchema(propSchema as OpenAPIV3.SchemaObject);
        }
      }
    }

    return obj;
  }

  private generateArray(generator: () => any): any[] {
    if (!this.options.generateArrays) return [];

    const length = Math.floor(
      Math.random() * (this.options.arrayMaxLength - this.options.arrayMinLength + 1) + this.options.arrayMinLength
    );

    return Array.from({ length }, generator);
  }

  private generateString(schema: OpenAPIV3.SchemaObject): string {
    // Handle format-specific generation
    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return this.getRandomValue('emails');
        case 'uri':
        case 'url':
          return `https://example.com/${this.generateId()}`;
        case 'uuid':
          return this.generateUUID();
        case 'date':
          return this.generateDate();
        case 'date-time':
          return this.generateTimestamp();
        case 'password':
          return '********';
        case 'byte':
          return btoa(this.generateId());
        case 'binary':
          return this.generateId();
        default:
          break;
      }
    }

    // Handle enum values
    if (schema.enum) {
      return this.getRandomArrayValue(schema.enum as string[]);
    }

    // Handle pattern
    if (schema.pattern) {
      return this.generateFromPattern(schema.pattern);
    }

    // Handle length constraints
    const minLength = schema.minLength || 1;
    const maxLength = schema.maxLength || 50;
    
    // Generate contextual string based on property name
    return this.generateContextualString(minLength, maxLength);
  }

  private generateNumber(schema: OpenAPIV3.SchemaObject): number {
    const min = schema.minimum || 0;
    const max = schema.maximum || 1000;
    const isInteger = schema.type === 'integer';

    let value = Math.random() * (max - min) + min;
    
    if (isInteger) {
      value = Math.floor(value);
    }

    // Handle multipleOf
    if (schema.multipleOf) {
      value = Math.round(value / schema.multipleOf) * schema.multipleOf;
    }

    return value;
  }

  private generateBoolean(schema: OpenAPIV3.SchemaObject): boolean {
    return Math.random() > 0.5;
  }

  private generateByFormat(schema: OpenAPIV3.SchemaObject): any {
    if (schema.format) {
      switch (schema.format) {
        case 'date':
          return this.generateDate();
        case 'date-time':
          return this.generateTimestamp();
        case 'email':
          return this.getRandomValue('emails');
        case 'uuid':
          return this.generateUUID();
        case 'uri':
          return `https://example.com/${this.generateId()}`;
        default:
          return this.generateId();
      }
    }

    return null;
  }

  private generateContextualString(minLength: number, maxLength: number): string {
    const strings = [
      ...this.realisticData.names,
      ...this.realisticData.companies,
      ...this.realisticData.cities,
      ...this.realisticData.descriptions,
    ];

    let result = this.getRandomArrayValue(strings);
    
    // Adjust length if needed
    if (result.length < minLength) {
      result = result.padEnd(minLength, ' and more content');
    } else if (result.length > maxLength) {
      result = result.substring(0, maxLength - 3) + '...';
    }

    return result;
  }

  private generateFromPattern(pattern: string): string {
    // Simple pattern matching for common patterns
    if (pattern.includes('[0-9]')) {
      return this.generateId();
    }
    if (pattern.includes('[a-zA-Z]')) {
      return this.getRandomValue('names');
    }
    // For complex patterns, return a simple string
    return 'pattern-match-' + this.generateId();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateTimestamp(): string {
    const now = new Date();
    const randomOffset = Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000); // Random day in the past year
    return new Date(now.getTime() - randomOffset).toISOString();
  }

  private generateDate(): string {
    return this.generateTimestamp().split('T')[0];
  }

  private getRandomValue(category: string): string {
    const values = this.realisticData[category];
    return values ? this.getRandomArrayValue(values) : 'mock-value';
  }

  private getRandomArrayValue<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate specific mock data for common entities
  generateUserMock(): any {
    return {
      id: this.generateUUID(),
      name: this.getRandomValue('names'),
      email: this.getRandomValue('emails'),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getRandomValue('names'))}`,
      role: this.getRandomArrayValue(['admin', 'user', 'moderator']),
      status: this.getRandomValue('statuses'),
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
    };
  }

  generateOrderMock(): any {
    return {
      id: this.generateUUID(),
      orderNumber: `ORD-${Math.floor(Math.random() * 100000)}`,
      customerId: this.generateUUID(),
      customerName: this.getRandomValue('names'),
      status: this.getRandomArrayValue(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
      total: Math.floor(Math.random() * 1000) + 10,
      currency: this.getRandomValue('currencies'),
      items: this.generateArray(() => ({
        id: this.generateUUID(),
        name: `Product ${Math.floor(Math.random() * 100)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.floor(Math.random() * 100) + 10,
      })),
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
    };
  }

  generateProductMock(): any {
    return {
      id: this.generateUUID(),
      name: `Product ${Math.floor(Math.random() * 1000)}`,
      description: this.getRandomValue('descriptions'),
      price: Math.floor(Math.random() * 1000) + 10,
      currency: this.getRandomValue('currencies'),
      category: this.getRandomValue('categories'),
      inStock: Math.random() > 0.2,
      stockQuantity: Math.floor(Math.random() * 100),
      images: this.generateArray(() => `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`),
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
    };
  }

  generateCompanyMock(): any {
    return {
      id: this.generateUUID(),
      name: this.getRandomValue('companies'),
      description: this.getRandomValue('descriptions'),
      website: `https://${this.getRandomValue('companies').toLowerCase().replace(/\s+/g, '')}.com`,
      email: `contact@${this.getRandomValue('companies').toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      address: {
        street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
        city: this.getRandomValue('cities'),
        country: this.getRandomValue('countries'),
        postalCode: Math.floor(Math.random() * 90000) + 10000,
      },
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
    };
  }
}