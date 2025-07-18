/**
 * Object manipulation utility functions
 */

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Deep merges multiple objects
 */
export function deepMerge(...objects: any[]): any {
  const result: any = {};

  objects.forEach(obj => {
    if (obj) {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], value);
          } else {
            result[key] = value;
          }
        }
      });
    }
  });

  return result;
}

/**
 * Checks if a value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object &&
         Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Gets a nested property value using dot notation
 */
export function get<T = any>(obj: any, path: string, defaultValue?: T): T {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue as T;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue as T;
}

/**
 * Sets a nested property value using dot notation
 */
export function set<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: any = obj;

  for (const key of keys) {
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
  return obj;
}

/**
 * Checks if an object has a nested property using dot notation
 */
export function has(obj: any, path: string): boolean {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Removes a nested property using dot notation
 */
export function unset<T extends Record<string, any>>(obj: T, path: string): boolean {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  if (current != null && typeof current === 'object' && lastKey in current) {
    delete current[lastKey];
    return true;
  }

  return false;
}

/**
 * Picks specified properties from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });

  return result;
}

/**
 * Omits specified properties from an object
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as any;
  
  keys.forEach(key => {
    delete result[key];
  });

  return result;
}

/**
 * Creates an object from key-value pairs
 */
export function fromPairs<T = any>(pairs: Array<[string, T]>): Record<string, T> {
  const result: Record<string, T> = {};
  
  pairs.forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
}

/**
 * Converts an object to key-value pairs
 */
export function toPairs<T>(obj: Record<string, T>): Array<[string, T]> {
  return Object.entries(obj);
}

/**
 * Inverts the keys and values of an object
 */
export function invert(obj: Record<string, string | number>): Record<string, string> {
  const result: Record<string, string> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    result[String(value)] = key;
  });

  return result;
}

/**
 * Maps over object values
 */
export function mapValues<T, R>(obj: Record<string, T>, mapper: (value: T, key: string) => R): Record<string, R> {
  const result: Record<string, R> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    result[key] = mapper(value, key);
  });

  return result;
}

/**
 * Maps over object keys
 */
export function mapKeys<T>(obj: Record<string, T>, mapper: (key: string, value: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    result[mapper(key, value)] = value;
  });

  return result;
}

/**
 * Filters object entries by predicate
 */
export function pickBy<T>(obj: Record<string, T>, predicate: (value: T, key: string) => boolean): Record<string, T> {
  const result: Record<string, T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (predicate(value, key)) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Removes object entries by predicate
 */
export function omitBy<T>(obj: Record<string, T>, predicate: (value: T, key: string) => boolean): Record<string, T> {
  const result: Record<string, T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (!predicate(value, key)) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Flattens a nested object into a flat object with dot notation keys
 */
export function flatten(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (isPlainObject(value)) {
      Object.assign(result, flatten(value, newKey));
    } else {
      result[newKey] = value;
    }
  });

  return result;
}

/**
 * Unflattens a flat object with dot notation keys into a nested object
 */
export function unflatten(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    set(result, key, value);
  });

  return result;
}

/**
 * Checks if two objects are deeply equal
 */
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    if (!isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if an object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) {
    return true;
  }

  if (Array.isArray(obj) || typeof obj === 'string') {
    return obj.length === 0;
  }

  if (obj instanceof Map || obj instanceof Set) {
    return obj.size === 0;
  }

  if (isPlainObject(obj)) {
    return Object.keys(obj).length === 0;
  }

  return false;
}

/**
 * Removes undefined and null values from an object
 */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value != null) {
      result[key as keyof T] = value;
    }
  });

  return result;
}

/**
 * Gets all keys of an object including nested keys
 */
export function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    
    if (isPlainObject(value)) {
      keys.push(...getAllKeys(value, fullKey));
    }
  });

  return keys;
}

/**
 * Gets all values of an object including nested values
 */
export function getAllValues(obj: Record<string, any>): any[] {
  const values: any[] = [];
  
  Object.values(obj).forEach(value => {
    values.push(value);
    
    if (isPlainObject(value)) {
      values.push(...getAllValues(value));
    }
  });

  return values;
}