/**
 * Object utilities tests
 */

import {
  deepClone,
  deepMerge,
  isPlainObject,
  get,
  set,
  has,
  unset,
  pick,
  omit,
  fromPairs,
  toPairs,
  invert,
  mapValues,
  mapKeys,
  pickBy,
  omitBy,
  flatten,
  unflatten,
  isEqual,
  isEmpty,
  compact,
  getAllKeys,
  getAllValues
} from '../object';

describe('Object Utilities', () => {
  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(null)).toBe(null);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);
      
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone dates', () => {
      const date = new Date();
      const cloned = deepClone(date);
      
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 }, e: 4 };
      const result = deepMerge(obj1, obj2);
      
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });

    it('should handle undefined values', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: undefined, b: 2 };
      const result = deepMerge(obj1, obj2);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('isPlainObject', () => {
    it('should identify plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });
  });

  describe('get', () => {
    const obj = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3
        }
      }
    };

    it('should get nested values', () => {
      expect(get(obj, 'a')).toBe(1);
      expect(get(obj, 'b.c')).toBe(2);
      expect(get(obj, 'b.d.e')).toBe(3);
    });

    it('should return default for missing paths', () => {
      expect(get(obj, 'x.y.z', 'default')).toBe('default');
      expect(get(obj, 'b.x', 'default')).toBe('default');
    });

    it('should handle null/undefined objects', () => {
      expect(get(null, 'a', 'default')).toBe('default');
      expect(get(undefined, 'a', 'default')).toBe('default');
    });
  });

  describe('set', () => {
    it('should set nested values', () => {
      const obj = {};
      set(obj, 'a.b.c', 123);
      
      expect(obj).toEqual({
        a: {
          b: {
            c: 123
          }
        }
      });
    });

    it('should overwrite existing values', () => {
      const obj = { a: { b: 1 } };
      set(obj, 'a.b', 2);
      
      expect(obj.a.b).toBe(2);
    });
  });

  describe('has', () => {
    const obj = {
      a: 1,
      b: {
        c: 2
      }
    };

    it('should check for existing paths', () => {
      expect(has(obj, 'a')).toBe(true);
      expect(has(obj, 'b.c')).toBe(true);
    });

    it('should return false for missing paths', () => {
      expect(has(obj, 'x')).toBe(false);
      expect(has(obj, 'b.x')).toBe(false);
    });
  });

  describe('unset', () => {
    it('should remove nested properties', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = unset(obj, 'a.b.c');
      
      expect(result).toBe(true);
      expect(has(obj, 'a.b.c')).toBe(false);
    });

    it('should return false for missing properties', () => {
      const obj = { a: 1 };
      const result = unset(obj, 'x.y');
      
      expect(result).toBe(false);
    });
  });

  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle missing properties', () => {
      const obj = { a: 1 };
      const result = pick(obj, ['a', 'b'] as any);
      
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('fromPairs', () => {
    it('should create object from pairs', () => {
      const pairs: Array<[string, any]> = [['a', 1], ['b', 2]];
      const result = fromPairs(pairs);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('toPairs', () => {
    it('should convert object to pairs', () => {
      const obj = { a: 1, b: 2 };
      const result = toPairs(obj);
      
      expect(result).toEqual([['a', 1], ['b', 2]]);
    });
  });

  describe('invert', () => {
    it('should invert keys and values', () => {
      const obj = { a: '1', b: '2' };
      const result = invert(obj);
      
      expect(result).toEqual({ '1': 'a', '2': 'b' });
    });
  });

  describe('mapValues', () => {
    it('should map over values', () => {
      const obj = { a: 1, b: 2 };
      const result = mapValues(obj, value => value * 2);
      
      expect(result).toEqual({ a: 2, b: 4 });
    });
  });

  describe('mapKeys', () => {
    it('should map over keys', () => {
      const obj = { a: 1, b: 2 };
      const result = mapKeys(obj, key => key.toUpperCase());
      
      expect(result).toEqual({ A: 1, B: 2 });
    });
  });

  describe('pickBy', () => {
    it('should pick by predicate', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pickBy(obj, value => value > 1);
      
      expect(result).toEqual({ b: 2, c: 3 });
    });
  });

  describe('omitBy', () => {
    it('should omit by predicate', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omitBy(obj, value => value > 1);
      
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('flatten', () => {
    it('should flatten nested objects', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3
          }
        }
      };
      const result = flatten(obj);
      
      expect(result).toEqual({
        'a': 1,
        'b.c': 2,
        'b.d.e': 3
      });
    });
  });

  describe('unflatten', () => {
    it('should unflatten flat objects', () => {
      const obj = {
        'a': 1,
        'b.c': 2,
        'b.d.e': 3
      };
      const result = unflatten(obj);
      
      expect(result).toEqual({
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3
          }
        }
      });
    });
  });

  describe('isEqual', () => {
    it('should compare objects deeply', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      const obj3 = { a: 1, b: { c: 3 } };
      
      expect(isEqual(obj1, obj2)).toBe(true);
      expect(isEqual(obj1, obj3)).toBe(false);
    });

    it('should handle arrays', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should handle primitives', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual('a', 'a')).toBe(true);
      expect(isEqual(null, null)).toBe(true);
      expect(isEqual(undefined, undefined)).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('should detect empty objects', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should detect non-empty objects', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty('a')).toBe(false);
    });

    it('should handle Map and Set', () => {
      expect(isEmpty(new Map())).toBe(true);
      expect(isEmpty(new Set())).toBe(true);
      
      const map = new Map();
      map.set('a', 1);
      expect(isEmpty(map)).toBe(false);
      
      const set = new Set();
      set.add(1);
      expect(isEmpty(set)).toBe(false);
    });
  });

  describe('compact', () => {
    it('should remove null and undefined values', () => {
      const obj = { a: 1, b: null, c: undefined, d: 2 };
      const result = compact(obj);
      
      expect(result).toEqual({ a: 1, d: 2 });
    });
  });

  describe('getAllKeys', () => {
    it('should get all keys including nested', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3
          }
        }
      };
      const result = getAllKeys(obj);
      
      expect(result).toEqual(['a', 'b', 'b.c', 'b.d', 'b.d.e']);
    });
  });

  describe('getAllValues', () => {
    it('should get all values including nested', () => {
      const obj = {
        a: 1,
        b: {
          c: 2
        }
      };
      const result = getAllValues(obj);
      
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContainEqual({ c: 2 });
    });
  });
});