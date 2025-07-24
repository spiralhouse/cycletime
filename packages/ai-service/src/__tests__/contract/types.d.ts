/**
 * Type definitions for contract testing dependencies
 */

declare module 'js-yaml' {
  export function load(str: string): any;
  export function dump(obj: any): string;
}

declare module 'swagger-parser' {
  export function validate(spec: any): Promise<any>;
  export function parse(spec: any): Promise<any>;
}