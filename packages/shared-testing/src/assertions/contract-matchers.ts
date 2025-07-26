/**
 * Contract Matchers - Custom Jest matchers for contract testing
 * 
 * This module provides custom Jest matchers specifically designed for
 * contract testing scenarios and validation.
 */

import { ValidationResult, EndpointReport, CorrelationReport } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContract(expected?: any): R;
      toHaveValidationErrors(expectedErrors?: string[]): R;
      toBeAvailableEndpoint(expectedStatusCode?: number): R;
      toHaveValidCorrelation(expectedEvents?: string[]): R;
      toMatchOpenApiSchema(schema: any): R;
      toMatchAsyncApiMessage(messageSchema: any): R;
      toHavePerformanceWithin(maxResponseTime: number): R;
      toMatchExactly(expected: any): R;
    }
  }
}

export interface ContractMatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Extend Jest expect with contract-specific matchers
 */
export function extendExpect(): void {
  if (typeof expect === 'undefined') {
    console.warn('Jest expect not available - contract matchers not installed');
    return;
  }

  expect.extend({
    toMatchContract,
    toHaveValidationErrors,
    toBeAvailableEndpoint,
    toHaveValidCorrelation,
    toMatchOpenApiSchema,
    toMatchAsyncApiMessage,
    toHavePerformanceWithin,
    toMatchExactly
  });
}

/**
 * Matcher for general contract validation
 */
function toMatchContract(
  received: ValidationResult,
  _expected?: any
): ContractMatcherResult {
  const pass = received.valid === true;

  if (pass) {
    return {
      pass: true,
      message: () => `Expected validation to fail but it passed`
    };
  } else {
    const errorMessages = received.errors.map(error => 
      `  - ${error.instancePath || '(root)'}: ${error.message}`
    ).join('\n');

    const warningMessages = received.warnings.length > 0
      ? `\nWarnings:\n${received.warnings.map(w => `  - ${w.message}`).join('\n')}`
      : '';

    return {
      pass: false,
      message: () => `Contract validation failed:\n${errorMessages}${warningMessages}`
    };
  }
}

/**
 * Matcher for specific validation errors
 */
function toHaveValidationErrors(
  received: ValidationResult,
  expectedErrors?: string[]
): ContractMatcherResult {
  const hasErrors = received.errors.length > 0;

  if (!expectedErrors) {
    return {
      pass: hasErrors,
      message: () => hasErrors 
        ? `Expected no validation errors but found ${received.errors.length}`
        : `Expected validation errors but found none`
    };
  }

  const actualErrorMessages = received.errors.map(e => e.message);
  const missingErrors = expectedErrors.filter(expected => 
    !actualErrorMessages.some(actual => actual.includes(expected))
  );

  const pass = missingErrors.length === 0 && hasErrors;

  return {
    pass,
    message: () => {
      if (missingErrors.length > 0) {
        return `Expected validation errors not found:\n${missingErrors.map(e => `  - ${e}`).join('\n')}\n\nActual errors:\n${actualErrorMessages.map(e => `  - ${e}`).join('\n')}`;
      }
      return hasErrors
        ? `Validation errors found as expected`
        : `Expected validation errors but found none`;
    }
  };
}

/**
 * Matcher for endpoint availability
 */
function toBeAvailableEndpoint(
  received: EndpointReport,
  expectedStatusCode?: number
): ContractMatcherResult {
  const isAvailable = received.available;
  const statusMatches = !expectedStatusCode || received.statusCode === expectedStatusCode;
  
  const pass = isAvailable && statusMatches;

  return {
    pass,
    message: () => {
      if (!isAvailable) {
        const errorMessages = received.errors.map(e => e.message).join(', ');
        return `Expected endpoint ${received.method} ${received.endpoint} to be available but it was not. Errors: ${errorMessages}`;
      }
      
      if (!statusMatches) {
        return `Expected endpoint ${received.method} ${received.endpoint} to return status ${expectedStatusCode} but got ${received.statusCode}`;
      }

      return `Endpoint ${received.method} ${received.endpoint} is available`;
    }
  };
}

/**
 * Matcher for event correlation validation
 */
function toHaveValidCorrelation(
  received: CorrelationReport,
  expectedEvents?: string[]
): ContractMatcherResult {
  const hasValidCorrelation = received.valid;

  if (!expectedEvents) {
    return {
      pass: hasValidCorrelation,
      message: () => hasValidCorrelation
        ? `Event correlation is valid`
        : `Event correlation is invalid. Missing: [${received.missingEvents.join(', ')}], Unexpected: [${received.unexpectedEvents.join(', ')}]`
    };
  }

  const actualEventNames = received.events.map(e => e.eventName);
  const hasExpectedEvents = expectedEvents.every(expected => 
    actualEventNames.includes(expected)
  );

  const pass = hasValidCorrelation && hasExpectedEvents;

  return {
    pass,
    message: () => {
      if (!hasValidCorrelation) {
        return `Event correlation is invalid. Missing: [${received.missingEvents.join(', ')}], Unexpected: [${received.unexpectedEvents.join(', ')}]`;
      }
      
      if (!hasExpectedEvents) {
        const missing = expectedEvents.filter(e => !actualEventNames.includes(e));
        return `Expected events not found in correlation: [${missing.join(', ')}]`;
      }

      return `Event correlation is valid with expected events`;
    }
  };
}

/**
 * Matcher for OpenAPI schema validation
 */
function toMatchOpenApiSchema(
  received: any,
  schema: any
): ContractMatcherResult {
  // This would typically use AJV or similar for validation
  // For now, basic type checking
  if (!schema || !received) {
    return {
      pass: false,
      message: () => `Schema or data is missing`
    };
  }

  // Basic validation - in real implementation, would use AJV
  const pass = typeof received === schema.type || schema.type === undefined;

  return {
    pass,
    message: () => pass
      ? `Data matches OpenAPI schema`
      : `Data does not match OpenAPI schema. Expected type: ${schema.type}, got: ${typeof received}`
  };
}

/**
 * Matcher for AsyncAPI message validation
 */
function toMatchAsyncApiMessage(
  received: any,
  messageSchema: any
): ContractMatcherResult {
  // Similar to OpenAPI schema validation but for AsyncAPI messages
  if (!messageSchema || !received) {
    return {
      pass: false,
      message: () => `Message schema or data is missing`
    };
  }

  // Basic validation - in real implementation, would validate against AsyncAPI schema
  const hasRequiredFields = messageSchema.payload && messageSchema.payload.required
    ? messageSchema.payload.required.every((field: string) => received[field] !== undefined)
    : true;

  return {
    pass: hasRequiredFields,
    message: () => hasRequiredFields
      ? `Message matches AsyncAPI schema`
      : `Message does not match AsyncAPI schema. Missing required fields.`
  };
}

/**
 * Matcher for performance validation
 */
function toHavePerformanceWithin(
  received: { responseTime?: number; [key: string]: any },
  maxResponseTime: number
): ContractMatcherResult {
  const responseTime = received.responseTime;
  
  if (responseTime === undefined) {
    return {
      pass: false,
      message: () => `Response time not available in received object`
    };
  }

  const pass = responseTime <= maxResponseTime;

  return {
    pass,
    message: () => pass
      ? `Performance is within expected limits (${responseTime}ms <= ${maxResponseTime}ms)`
      : `Performance exceeds expected limits (${responseTime}ms > ${maxResponseTime}ms)`
  };
}

/**
 * Matcher for exact object matching with detailed differences
 */
function toMatchExactly(
  received: any,
  expected: any
): ContractMatcherResult {
  const differences: string[] = [];

  const areEqual = deepEqual(received, expected, '', differences);

  return {
    pass: areEqual,
    message: () => areEqual
      ? `Objects match exactly`
      : `Objects do not match exactly:\n${differences.map(d => `  - ${d}`).join('\n')}`
  };
}

/**
 * Helper function for deep equality comparison
 */
function deepEqual(
  received: any,
  expected: any,
  path: string = '',
  differences: string[]
): boolean {
  if (received === expected) {
    return true;
  }

  if (received === null || expected === null) {
    differences.push(`${path}: expected ${expected}, received ${received}`);
    return false;
  }

  if (typeof received !== typeof expected) {
    differences.push(`${path}: type mismatch - expected ${typeof expected}, received ${typeof received}`);
    return false;
  }

  if (typeof received === 'object') {
    if (Array.isArray(received) !== Array.isArray(expected)) {
      differences.push(`${path}: array/object type mismatch`);
      return false;
    }

    if (Array.isArray(received)) {
      if (received.length !== expected.length) {
        differences.push(`${path}: array length mismatch - expected ${expected.length}, received ${received.length}`);
        return false;
      }

      let allEqual = true;
      for (let i = 0; i < received.length; i++) {
        const itemPath = `${path}[${i}]`;
        if (!deepEqual(received[i], expected[i], itemPath, differences)) {
          allEqual = false;
        }
      }
      return allEqual;
    } else {
      const receivedKeys = Object.keys(received);
      const expectedKeys = Object.keys(expected);
      
      const allKeys = new Set([...receivedKeys, ...expectedKeys]);
      let allEqual = true;

      for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        
        if (!(key in expected)) {
          differences.push(`${keyPath}: unexpected property`);
          allEqual = false;
        } else if (!(key in received)) {
          differences.push(`${keyPath}: missing property`);
          allEqual = false;
        } else if (!deepEqual(received[key], expected[key], keyPath, differences)) {
          allEqual = false;
        }
      }

      return allEqual;
    }
  }

  differences.push(`${path}: expected ${expected}, received ${received}`);
  return false;
}