/**
 * Array utilities tests
 */

import {
  unique,
  uniqueBy,
  chunk,
  flatten,
  flattenDeep,
  groupBy,
  countBy,
  intersection,
  difference,
  symmetricDifference,
  shuffle,
  sample,
  sampleSize,
  partition,
  sortBy,
  maxBy,
  minBy,
  sum,
  average,
  every,
  some,
  range,
  fill,
  compact,
  zip,
  unzip
} from '../array';

describe('Array Utilities', () => {
  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty arrays', () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe('uniqueBy', () => {
    const users = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
      { id: 1, name: 'John Doe' }
    ];

    it('should remove duplicates by key', () => {
      const result = uniqueBy(users, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should remove duplicates by function', () => {
      const result = uniqueBy(users, user => user.id);
      expect(result).toHaveLength(2);
    });
  });

  describe('chunk', () => {
    it('should chunk arrays correctly', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('should throw for invalid chunk size', () => {
      expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be greater than 0');
      expect(() => chunk([1, 2, 3], -1)).toThrow('Chunk size must be greater than 0');
    });
  });

  describe('flatten', () => {
    it('should flatten one level', () => {
      expect(flatten([1, [2, 3], 4, [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not flatten deeply nested arrays', () => {
      expect(flatten([1, [2, [3, 4]]])).toEqual([1, 2, [3, 4]]);
    });
  });

  describe('flattenDeep', () => {
    it('should flatten deeply nested arrays', () => {
      expect(flattenDeep([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
    });
  });

  describe('groupBy', () => {
    const users = [
      { name: 'John', age: 25 },
      { name: 'Jane', age: 30 },
      { name: 'Bob', age: 25 }
    ];

    it('should group by key', () => {
      const result = groupBy(users, 'age');
      expect(result['25']).toHaveLength(2);
      expect(result['30']).toHaveLength(1);
    });

    it('should group by function', () => {
      const result = groupBy(users, user => user.age);
      expect(result['25']).toHaveLength(2);
      expect(result['30']).toHaveLength(1);
    });
  });

  describe('countBy', () => {
    it('should count occurrences', () => {
      const result = countBy([1, 2, 2, 3, 3, 3]);
      expect(result['1']).toBe(1);
      expect(result['2']).toBe(2);
      expect(result['3']).toBe(3);
    });

    it('should count by key', () => {
      const users = [
        { status: 'active' },
        { status: 'inactive' },
        { status: 'active' }
      ];
      const result = countBy(users, 'status');
      expect(result['active']).toBe(2);
      expect(result['inactive']).toBe(1);
    });
  });

  describe('intersection', () => {
    it('should find intersection of arrays', () => {
      expect(intersection([1, 2, 3], [2, 3, 4], [3, 4, 5])).toEqual([3]);
      expect(intersection([1, 2], [3, 4])).toEqual([]);
    });

    it('should handle empty arrays', () => {
      expect(intersection()).toEqual([]);
      expect(intersection([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('difference', () => {
    it('should find difference between arrays', () => {
      expect(difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
      expect(difference([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3]);
    });
  });

  describe('symmetricDifference', () => {
    it('should find symmetric difference', () => {
      expect(symmetricDifference([1, 2, 3], [2, 3, 4])).toEqual([1, 4]);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
      expect(original).toEqual([1, 2, 3, 4, 5]); // Original should be unchanged
    });
  });

  describe('sample', () => {
    it('should return random element', () => {
      const array = [1, 2, 3, 4, 5];
      const sampled = sample(array);
      expect(array).toContain(sampled);
    });

    it('should return undefined for empty array', () => {
      expect(sample([])).toBeUndefined();
    });
  });

  describe('sampleSize', () => {
    it('should return multiple random elements', () => {
      const array = [1, 2, 3, 4, 5];
      const sampled = sampleSize(array, 3);
      
      expect(sampled).toHaveLength(3);
      sampled.forEach(item => expect(array).toContain(item));
    });

    it('should return all elements if size >= array length', () => {
      const array = [1, 2, 3];
      const sampled = sampleSize(array, 5);
      expect(sampled).toHaveLength(3);
    });

    it('should return empty array for size <= 0', () => {
      expect(sampleSize([1, 2, 3], 0)).toEqual([]);
      expect(sampleSize([1, 2, 3], -1)).toEqual([]);
    });
  });

  describe('partition', () => {
    it('should partition array by predicate', () => {
      const [evens, odds] = partition([1, 2, 3, 4, 5], n => n % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });
  });

  describe('sortBy', () => {
    const users = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 }
    ];

    it('should sort by key', () => {
      const sorted = sortBy(users, 'age');
      expect(sorted[0].age).toBe(25);
      expect(sorted[2].age).toBe(35);
    });

    it('should sort by function', () => {
      const sorted = sortBy(users, user => user.age);
      expect(sorted[0].age).toBe(25);
      expect(sorted[2].age).toBe(35);
    });

    it('should sort by multiple keys', () => {
      const users2 = [
        { name: 'John', age: 30, city: 'A' },
        { name: 'Jane', age: 30, city: 'B' },
        { name: 'Bob', age: 25, city: 'A' }
      ];
      const sorted = sortBy(users2, 'age', 'city');
      expect(sorted[0].name).toBe('Bob');
      expect(sorted[1].city).toBe('A');
      expect(sorted[2].city).toBe('B');
    });
  });

  describe('maxBy', () => {
    const users = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 }
    ];

    it('should find max by key', () => {
      const result = maxBy(users, 'age');
      expect(result?.name).toBe('Bob');
    });

    it('should return undefined for empty array', () => {
      expect(maxBy([], 'age')).toBeUndefined();
    });
  });

  describe('minBy', () => {
    const users = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 }
    ];

    it('should find min by key', () => {
      const result = minBy(users, 'age');
      expect(result?.name).toBe('Jane');
    });
  });

  describe('sum', () => {
    it('should sum numbers', () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
      expect(sum([])).toBe(0);
    });

    it('should sum by key', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      expect(sum(items, 'value')).toBe(60);
    });

    it('should sum by function', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      expect(sum(items, item => item.value)).toBe(60);
    });
  });

  describe('average', () => {
    it('should calculate average', () => {
      expect(average([1, 2, 3, 4])).toBe(2.5);
      expect(average([])).toBe(0);
    });

    it('should calculate average by key', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      expect(average(items, 'value')).toBe(20);
    });
  });

  describe('every', () => {
    it('should check if all elements pass predicate', () => {
      expect(every([2, 4, 6], n => n % 2 === 0)).toBe(true);
      expect(every([1, 2, 3], n => n % 2 === 0)).toBe(false);
    });
  });

  describe('some', () => {
    it('should check if any element passes predicate', () => {
      expect(some([1, 2, 3], n => n % 2 === 0)).toBe(true);
      expect(some([1, 3, 5], n => n % 2 === 0)).toBe(false);
    });
  });

  describe('range', () => {
    it('should create range of numbers', () => {
      expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10]);
    });

    it('should handle negative steps', () => {
      expect(range(5, 1, -1)).toEqual([5, 4, 3, 2, 1]);
    });

    it('should throw for zero step', () => {
      expect(() => range(1, 5, 0)).toThrow('Step cannot be zero');
    });
  });

  describe('fill', () => {
    it('should fill array with value', () => {
      expect(fill(3, 'x')).toEqual(['x', 'x', 'x']);
    });

    it('should fill array with function', () => {
      expect(fill(3, i => i * 2)).toEqual([0, 2, 4]);
    });
  });

  describe('compact', () => {
    it('should remove falsy values', () => {
      expect(compact([1, 0, 2, null, 3, undefined, 4, false, 5, ''])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('zip', () => {
    it('should zip arrays together', () => {
      expect(zip([1, 2], ['a', 'b'], [true, false])).toEqual([
        [1, 'a', true],
        [2, 'b', false]
      ]);
    });

    it('should handle arrays of different lengths', () => {
      expect(zip([1, 2, 3], ['a', 'b'])).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, undefined]
      ]);
    });
  });

  describe('unzip', () => {
    it('should unzip array of arrays', () => {
      expect(unzip([[1, 'a'], [2, 'b'], [3, 'c']])).toEqual([
        [1, 2, 3],
        ['a', 'b', 'c']
      ]);
    });

    it('should handle empty array', () => {
      expect(unzip([])).toEqual([]);
    });
  });
});