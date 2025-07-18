/**
 * Array manipulation utility functions
 */

/**
 * Removes duplicate values from an array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Removes duplicate objects from an array based on a key
 */
export function uniqueBy<T>(array: T[], key: keyof T | ((item: T) => any)): T[] {
  const seen = new Set();
  const getKey = typeof key === 'function' ? key : (item: T) => item[key];
  
  return array.filter(item => {
    const keyValue = getKey(item);
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flattens a nested array by one level
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, val) => {
    return acc.concat(Array.isArray(val) ? val : [val]);
  }, []);
}

/**
 * Deeply flattens a nested array
 */
export function flattenDeep(array: any[]): any[] {
  return array.reduce((acc, val) => {
    return acc.concat(Array.isArray(val) ? flattenDeep(val) : val);
  }, []);
}

/**
 * Groups array elements by a key
 */
export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string | number)): Record<string, T[]> {
  const getKey = typeof key === 'function' ? key : (item: T) => String(item[key]);
  
  return array.reduce((groups, item) => {
    const groupKey = String(getKey(item));
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Counts occurrences of each element in an array
 */
export function countBy<T>(array: T[], key?: keyof T | ((item: T) => string | number)): Record<string, number> {
  const getKey = key 
    ? (typeof key === 'function' ? key : (item: T) => String(item[key]))
    : (item: T) => String(item);
  
  return array.reduce((counts, item) => {
    const keyValue = String(getKey(item));
    counts[keyValue] = (counts[keyValue] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

/**
 * Finds the intersection of multiple arrays
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];
  
  const [first, ...rest] = arrays;
  return unique(first.filter(item => 
    rest.every(array => array.includes(item))
  ));
}

/**
 * Finds the difference between two arrays (elements in first but not in second)
 */
export function difference<T>(first: T[], second: T[]): T[] {
  const secondSet = new Set(second);
  return first.filter(item => !secondSet.has(item));
}

/**
 * Finds the symmetric difference between two arrays (elements in either but not both)
 */
export function symmetricDifference<T>(first: T[], second: T[]): T[] {
  return [
    ...difference(first, second),
    ...difference(second, first)
  ];
}

/**
 * Shuffles an array randomly
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Returns a random element from an array
 */
export function sample<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns multiple random elements from an array
 */
export function sampleSize<T>(array: T[], size: number): T[] {
  if (size >= array.length) return shuffle(array);
  if (size <= 0) return [];
  
  const shuffled = shuffle(array);
  return shuffled.slice(0, size);
}

/**
 * Partitions an array into two arrays based on a predicate
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  
  array.forEach(item => {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  });
  
  return [truthy, falsy];
}

/**
 * Sorts an array by a key or multiple keys
 */
export function sortBy<T>(array: T[], ...keys: (keyof T | ((item: T) => any))[]): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const getVal = typeof key === 'function' ? key : (item: T) => item[key];
      const aVal = getVal(a);
      const bVal = getVal(b);
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Finds the maximum element in an array by a key
 */
export function maxBy<T>(array: T[], key: keyof T | ((item: T) => number)): T | undefined {
  if (array.length === 0) return undefined;
  
  const getVal = typeof key === 'function' ? key : (item: T) => Number(item[key]);
  
  return array.reduce((max, current) => 
    getVal(current) > getVal(max) ? current : max
  );
}

/**
 * Finds the minimum element in an array by a key
 */
export function minBy<T>(array: T[], key: keyof T | ((item: T) => number)): T | undefined {
  if (array.length === 0) return undefined;
  
  const getVal = typeof key === 'function' ? key : (item: T) => Number(item[key]);
  
  return array.reduce((min, current) => 
    getVal(current) < getVal(min) ? current : min
  );
}

/**
 * Calculates the sum of an array of numbers or by a key
 */
export function sum(array: number[]): number;
export function sum<T>(array: T[], key: keyof T | ((item: T) => number)): number;
export function sum<T>(array: T[] | number[], key?: keyof T | ((item: T) => number)): number {
  if (typeof array[0] === 'number' && !key) {
    return (array as number[]).reduce((sum, val) => sum + val, 0);
  }
  
  if (!key) return 0;
  
  const getVal = typeof key === 'function' ? key : (item: T) => Number(item[key]);
  return (array as T[]).reduce((sum, item) => sum + getVal(item), 0);
}

/**
 * Calculates the average of an array of numbers or by a key
 */
export function average(array: number[]): number;
export function average<T>(array: T[], key: keyof T | ((item: T) => number)): number;
export function average<T>(array: T[] | number[], key?: keyof T | ((item: T) => number)): number {
  if (array.length === 0) return 0;
  
  const total = key ? sum(array as T[], key) : sum(array as number[]);
  return total / array.length;
}

/**
 * Checks if all elements in an array pass a test
 */
export function every<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.every(predicate);
}

/**
 * Checks if any element in an array passes a test
 */
export function some<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.some(predicate);
}

/**
 * Creates an array of numbers from start to end (inclusive)
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  
  if (step === 0) {
    throw new Error('Step cannot be zero');
  }
  
  if (step > 0) {
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i >= end; i += step) {
      result.push(i);
    }
  }
  
  return result;
}

/**
 * Creates an array with n elements filled with a value
 */
export function fill<T>(length: number, value: T | ((index: number) => T)): T[] {
  const result: T[] = [];
  const getValue = typeof value === 'function' ? value as (index: number) => T : () => value;
  
  for (let i = 0; i < length; i++) {
    result.push(getValue(i));
  }
  
  return result;
}

/**
 * Removes falsy values from an array
 */
export function compact<T>(array: (T | null | undefined | false | 0 | '')[]): T[] {
  return array.filter(Boolean) as T[];
}

/**
 * Zips multiple arrays together
 */
export function zip(...arrays: any[][]): any[][] {
  const maxLength = Math.max(...arrays.map(arr => arr.length));
  const result: any[][] = [];
  
  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map(arr => arr[i]));
  }
  
  return result;
}

/**
 * Unzips an array of arrays
 */
export function unzip<T>(array: T[][]): T[][] {
  if (array.length === 0) return [];
  
  const maxLength = Math.max(...array.map(arr => arr.length));
  const result: T[][] = [];
  
  for (let i = 0; i < maxLength; i++) {
    result.push(array.map(arr => arr[i]).filter(val => val !== undefined));
  }
  
  return result;
}