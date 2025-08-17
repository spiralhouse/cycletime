import { describe, it, expect, beforeEach } from 'vitest';

import { DIContainer } from '../../../../src/infrastructure/di/container.js';

import type { ServiceLifecycle } from '../../../../src/infrastructure/di/types.js';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('Service Registration', () => {
    it('should register a service with factory function', () => {
      const factory = () => ({ value: 42 });
      
      container.register('TestService', factory, 'singleton');
      
      expect(() => container.resolve('TestService')).not.toThrow();
    });

    it('should throw when registering duplicate service', () => {
      const factory = () => ({ value: 42 });
      
      container.register('DuplicateTest', factory, 'singleton');
      
      expect(() => container.register('DuplicateTest', factory, 'singleton'))
        .toThrow('Service DuplicateTest is already registered');
    });

    it('should allow overriding service with explicit flag', () => {
      const factory1 = () => ({ value: 1 });
      const factory2 = () => ({ value: 2 });
      
      container.register('OverrideTest', factory1, 'singleton');
      container.register('OverrideTest', factory2, 'singleton', { override: true });
      
      const instance = container.resolve<{ value: number }>('OverrideTest');
      expect(instance.value).toBe(2);
    });
  });

  describe('Singleton Lifecycle', () => {
    it('should return same instance for singleton services', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('SingletonService', factory, 'singleton');
      
      const instance1 = container.resolve('SingletonService');
      const instance2 = container.resolve('SingletonService');
      
      expect(instance1).toBe(instance2);
      expect(callCount).toBe(1);
    });

    it('should create singleton instance lazily on first resolve', () => {
      let created = false;
      const factory = () => {
        created = true;
        return { value: 'singleton' };
      };
      
      container.register('LazyService', factory, 'singleton');
      
      expect(created).toBe(false);
      
      container.resolve('LazyService');
      
      expect(created).toBe(true);
    });
  });

  describe('Transient Lifecycle', () => {
    it('should return new instance for transient services', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('TransientService', factory, 'transient');
      
      const instance1 = container.resolve<{ id: number }>('TransientService');
      const instance2 = container.resolve<{ id: number }>('TransientService');
      
      expect(instance1).not.toBe(instance2);
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('Scoped Lifecycle', () => {
    it('should return same instance within scope', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('ScopedService', factory, 'scoped');
      
      const scope = container.createScope();
      const instance1 = scope.resolve('ScopedService');
      const instance2 = scope.resolve('ScopedService');
      
      expect(instance1).toBe(instance2);
      expect(callCount).toBe(1);
    });

    it('should return different instances across scopes', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('ScopedServiceMulti', factory, 'scoped');
      
      const scope1 = container.createScope();
      const scope2 = container.createScope();
      
      const instance1 = scope1.resolve<{ id: number }>('ScopedServiceMulti');
      const instance2 = scope2.resolve<{ id: number }>('ScopedServiceMulti');
      
      expect(instance1).not.toBe(instance2);
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
    });

    it('should share singleton instances across scopes', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('SingletonService', factory, 'singleton');
      
      const scope1 = container.createScope();
      const scope2 = container.createScope();
      
      const instance1 = scope1.resolve('SingletonService');
      const instance2 = scope2.resolve('SingletonService');
      const instance3 = container.resolve('SingletonService');
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(callCount).toBe(1);
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve dependencies using container', () => {
      container.register('ConfigService', () => ({ apiUrl: 'http://api.test' }), 'singleton');
      container.register('ApiService', (c) => {
        const config = c.resolve<{ apiUrl: string }>('ConfigService');
        return { url: config.apiUrl };
      }, 'singleton');
      
      const apiService = container.resolve<{ url: string }>('ApiService');
      
      expect(apiService.url).toBe('http://api.test');
    });

    it('should resolve nested dependencies', () => {
      container.register('Logger', () => ({ log: (msg: string) => msg }), 'singleton');
      container.register('Database', (c) => {
        const logger = c.resolve('Logger');
        return { logger, connected: true };
      }, 'singleton');
      container.register('UserService', (c) => {
        const db = c.resolve<{ connected: boolean }>('Database');
        return { hasDb: db.connected };
      }, 'singleton');
      
      const userService = container.resolve<{ hasDb: boolean }>('UserService');
      
      expect(userService.hasDb).toBe(true);
    });

    it('should throw on missing dependency', () => {
      container.register('ServiceA', (c) => {
        return c.resolve('NonExistentService');
      }, 'singleton');
      
      expect(() => container.resolve('ServiceA'))
        .toThrow('Service NonExistentService is not registered');
    });

    it('should detect circular dependencies', () => {
      container.register('CircularA', (c) => {
        c.resolve('CircularB');
        return { name: 'A' };
      }, 'singleton');
      
      container.register('CircularB', (c) => {
        c.resolve('CircularA');
        return { name: 'B' };
      }, 'singleton');
      
      expect(() => container.resolve('CircularA'))
        .toThrow('Circular dependency detected: CircularA -> CircularB -> CircularA');
    });

    it('should handle complex circular dependency chains', () => {
      container.register('ChainA', (c) => {
        c.resolve('ChainB');
        return { name: 'A' };
      }, 'singleton');
      
      container.register('ChainB', (c) => {
        c.resolve('ChainC');
        return { name: 'B' };
      }, 'singleton');
      
      container.register('ChainC', (c) => {
        c.resolve('ChainA');
        return { name: 'C' };
      }, 'singleton');
      
      expect(() => container.resolve('ChainA'))
        .toThrow('Circular dependency detected: ChainA -> ChainB -> ChainC -> ChainA');
    });
  });

  describe('Service Inspection', () => {
    it('should check if service is registered', () => {
      expect(container.has('InspectionTest')).toBe(false);
      
      container.register('InspectionTest', () => ({}), 'singleton');
      
      expect(container.has('InspectionTest')).toBe(true);
    });

    it('should get service descriptor', () => {
      const factory = () => ({ value: 42 });
      container.register('DescriptorTest', factory, 'singleton');
      
      const descriptor = container.getDescriptor('DescriptorTest');
      
      expect(descriptor).toBeDefined();
      expect(descriptor?.lifecycle).toBe('singleton');
      expect(descriptor?.factory).toBe(factory);
    });

    it('should list all registered services', () => {
      const freshContainer = new DIContainer();
      freshContainer.register('Service1', () => ({}), 'singleton');
      freshContainer.register('Service2', () => ({}), 'transient');
      freshContainer.register('Service3', () => ({}), 'scoped');
      
      const services = freshContainer.getRegisteredServices();
      
      expect(services).toHaveLength(3);
      expect(services).toContain('Service1');
      expect(services).toContain('Service2');
      expect(services).toContain('Service3');
    });
  });

  describe('Container Disposal', () => {
    it('should dispose singleton instances with dispose method', () => {
      let disposed = false;
      
      container.register('DisposableService', () => ({
        dispose: () => { disposed = true; }
      }), 'singleton');
      
      container.resolve('DisposableService');
      container.dispose();
      
      expect(disposed).toBe(true);
    });

    it('should dispose all singletons on container disposal', () => {
      const disposed: string[] = [];
      
      container.register('DisposableService1', () => ({
        dispose: () => { disposed.push('DisposableService1'); }
      }), 'singleton');
      
      container.register('DisposableService2', () => ({
        dispose: () => { disposed.push('DisposableService2'); }
      }), 'singleton');
      
      container.resolve('DisposableService1');
      container.resolve('DisposableService2');
      container.dispose();
      
      expect(disposed).toContain('DisposableService1');
      expect(disposed).toContain('DisposableService2');
    });

    it('should clear singleton instances after disposal', () => {
      let callCount = 0;
      
      container.register('Service', () => {
        callCount++;
        return { id: callCount };
      }, 'singleton');
      
      const instance1 = container.resolve<{ id: number }>('Service');
      expect(instance1.id).toBe(1);
      
      container.dispose();
      
      const instance2 = container.resolve<{ id: number }>('Service');
      expect(instance2.id).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with generic resolution', () => {
      interface ITestService {
        getValue(): number;
      }
      
      container.register<ITestService>('TestService', () => ({
        getValue: () => 42
      }), 'singleton');
      
      const service = container.resolve<ITestService>('TestService');
      const value = service.getValue();
      
      expect(value).toBe(42);
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error for factory throwing', () => {
      container.register('FaultyService', () => {
        throw new Error('Factory error');
      }, 'singleton');
      
      expect(() => container.resolve('FaultyService'))
        .toThrow('Failed to create service FaultyService: Factory error');
    });

    it('should handle async factory errors gracefully', async () => {
      container.register('AsyncService', async () => {
        throw new Error('Async factory error');
      }, 'singleton');
      
      await expect(container.resolveAsync('AsyncService'))
        .rejects.toThrow('Failed to create service AsyncService: Async factory error');
    });
  });
});