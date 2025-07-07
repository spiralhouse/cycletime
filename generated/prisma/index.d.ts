
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model UserSession
 * 
 */
export type UserSession = $Result.DefaultSelection<Prisma.$UserSessionPayload>
/**
 * Model ApiKey
 * 
 */
export type ApiKey = $Result.DefaultSelection<Prisma.$ApiKeyPayload>
/**
 * Model Project
 * 
 */
export type Project = $Result.DefaultSelection<Prisma.$ProjectPayload>
/**
 * Model ProjectMember
 * 
 */
export type ProjectMember = $Result.DefaultSelection<Prisma.$ProjectMemberPayload>
/**
 * Model Repository
 * 
 */
export type Repository = $Result.DefaultSelection<Prisma.$RepositoryPayload>
/**
 * Model Document
 * 
 */
export type Document = $Result.DefaultSelection<Prisma.$DocumentPayload>
/**
 * Model DocumentVersion
 * 
 */
export type DocumentVersion = $Result.DefaultSelection<Prisma.$DocumentVersionPayload>
/**
 * Model AiRequest
 * 
 */
export type AiRequest = $Result.DefaultSelection<Prisma.$AiRequestPayload>
/**
 * Model AiResponse
 * 
 */
export type AiResponse = $Result.DefaultSelection<Prisma.$AiResponsePayload>
/**
 * Model UsageTracking
 * 
 */
export type UsageTracking = $Result.DefaultSelection<Prisma.$UsageTrackingPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ProjectStatus: {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED'
};

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]


export const MemberRole: {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole]


export const DocumentType: {
  README: 'README',
  TECHNICAL_SPEC: 'TECHNICAL_SPEC',
  USER_GUIDE: 'USER_GUIDE',
  API_DOCS: 'API_DOCS',
  CHANGELOG: 'CHANGELOG',
  ISSUE_TEMPLATE: 'ISSUE_TEMPLATE',
  PR_TEMPLATE: 'PR_TEMPLATE',
  OTHER: 'OTHER'
};

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]


export const DocumentStatus: {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]


export const AiRequestType: {
  DOCUMENTATION: 'DOCUMENTATION',
  CODE_REVIEW: 'CODE_REVIEW',
  PLANNING: 'PLANNING',
  TASK_ANALYSIS: 'TASK_ANALYSIS',
  GENERAL: 'GENERAL'
};

export type AiRequestType = (typeof AiRequestType)[keyof typeof AiRequestType]


export const AiRequestStatus: {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export type AiRequestStatus = (typeof AiRequestStatus)[keyof typeof AiRequestStatus]

}

export type ProjectStatus = $Enums.ProjectStatus

export const ProjectStatus: typeof $Enums.ProjectStatus

export type MemberRole = $Enums.MemberRole

export const MemberRole: typeof $Enums.MemberRole

export type DocumentType = $Enums.DocumentType

export const DocumentType: typeof $Enums.DocumentType

export type DocumentStatus = $Enums.DocumentStatus

export const DocumentStatus: typeof $Enums.DocumentStatus

export type AiRequestType = $Enums.AiRequestType

export const AiRequestType: typeof $Enums.AiRequestType

export type AiRequestStatus = $Enums.AiRequestStatus

export const AiRequestStatus: typeof $Enums.AiRequestStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userSession`: Exposes CRUD operations for the **UserSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserSessions
    * const userSessions = await prisma.userSession.findMany()
    * ```
    */
  get userSession(): Prisma.UserSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.apiKey`: Exposes CRUD operations for the **ApiKey** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ApiKeys
    * const apiKeys = await prisma.apiKey.findMany()
    * ```
    */
  get apiKey(): Prisma.ApiKeyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.project`: Exposes CRUD operations for the **Project** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Projects
    * const projects = await prisma.project.findMany()
    * ```
    */
  get project(): Prisma.ProjectDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.projectMember`: Exposes CRUD operations for the **ProjectMember** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProjectMembers
    * const projectMembers = await prisma.projectMember.findMany()
    * ```
    */
  get projectMember(): Prisma.ProjectMemberDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.repository`: Exposes CRUD operations for the **Repository** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Repositories
    * const repositories = await prisma.repository.findMany()
    * ```
    */
  get repository(): Prisma.RepositoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.document`: Exposes CRUD operations for the **Document** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Documents
    * const documents = await prisma.document.findMany()
    * ```
    */
  get document(): Prisma.DocumentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.documentVersion`: Exposes CRUD operations for the **DocumentVersion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DocumentVersions
    * const documentVersions = await prisma.documentVersion.findMany()
    * ```
    */
  get documentVersion(): Prisma.DocumentVersionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiRequest`: Exposes CRUD operations for the **AiRequest** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiRequests
    * const aiRequests = await prisma.aiRequest.findMany()
    * ```
    */
  get aiRequest(): Prisma.AiRequestDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aiResponse`: Exposes CRUD operations for the **AiResponse** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AiResponses
    * const aiResponses = await prisma.aiResponse.findMany()
    * ```
    */
  get aiResponse(): Prisma.AiResponseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.usageTracking`: Exposes CRUD operations for the **UsageTracking** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UsageTrackings
    * const usageTrackings = await prisma.usageTracking.findMany()
    * ```
    */
  get usageTracking(): Prisma.UsageTrackingDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.11.1
   * Query Engine version: f40f79ec31188888a2e33acda0ecc8fd10a853a9
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    UserSession: 'UserSession',
    ApiKey: 'ApiKey',
    Project: 'Project',
    ProjectMember: 'ProjectMember',
    Repository: 'Repository',
    Document: 'Document',
    DocumentVersion: 'DocumentVersion',
    AiRequest: 'AiRequest',
    AiResponse: 'AiResponse',
    UsageTracking: 'UsageTracking'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "userSession" | "apiKey" | "project" | "projectMember" | "repository" | "document" | "documentVersion" | "aiRequest" | "aiResponse" | "usageTracking"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      UserSession: {
        payload: Prisma.$UserSessionPayload<ExtArgs>
        fields: Prisma.UserSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          findFirst: {
            args: Prisma.UserSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          findMany: {
            args: Prisma.UserSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          create: {
            args: Prisma.UserSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          createMany: {
            args: Prisma.UserSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          delete: {
            args: Prisma.UserSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          update: {
            args: Prisma.UserSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          deleteMany: {
            args: Prisma.UserSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          upsert: {
            args: Prisma.UserSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          aggregate: {
            args: Prisma.UserSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserSession>
          }
          groupBy: {
            args: Prisma.UserSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserSessionCountArgs<ExtArgs>
            result: $Utils.Optional<UserSessionCountAggregateOutputType> | number
          }
        }
      }
      ApiKey: {
        payload: Prisma.$ApiKeyPayload<ExtArgs>
        fields: Prisma.ApiKeyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApiKeyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApiKeyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          findFirst: {
            args: Prisma.ApiKeyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApiKeyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          findMany: {
            args: Prisma.ApiKeyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>[]
          }
          create: {
            args: Prisma.ApiKeyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          createMany: {
            args: Prisma.ApiKeyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApiKeyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>[]
          }
          delete: {
            args: Prisma.ApiKeyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          update: {
            args: Prisma.ApiKeyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          deleteMany: {
            args: Prisma.ApiKeyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApiKeyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ApiKeyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>[]
          }
          upsert: {
            args: Prisma.ApiKeyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiKeyPayload>
          }
          aggregate: {
            args: Prisma.ApiKeyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApiKey>
          }
          groupBy: {
            args: Prisma.ApiKeyGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApiKeyGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApiKeyCountArgs<ExtArgs>
            result: $Utils.Optional<ApiKeyCountAggregateOutputType> | number
          }
        }
      }
      Project: {
        payload: Prisma.$ProjectPayload<ExtArgs>
        fields: Prisma.ProjectFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProjectFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProjectFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          findFirst: {
            args: Prisma.ProjectFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProjectFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          findMany: {
            args: Prisma.ProjectFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          create: {
            args: Prisma.ProjectCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          createMany: {
            args: Prisma.ProjectCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProjectCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          delete: {
            args: Prisma.ProjectDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          update: {
            args: Prisma.ProjectUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          deleteMany: {
            args: Prisma.ProjectDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProjectUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProjectUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          upsert: {
            args: Prisma.ProjectUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          aggregate: {
            args: Prisma.ProjectAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProject>
          }
          groupBy: {
            args: Prisma.ProjectGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProjectGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProjectCountArgs<ExtArgs>
            result: $Utils.Optional<ProjectCountAggregateOutputType> | number
          }
        }
      }
      ProjectMember: {
        payload: Prisma.$ProjectMemberPayload<ExtArgs>
        fields: Prisma.ProjectMemberFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProjectMemberFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProjectMemberFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          findFirst: {
            args: Prisma.ProjectMemberFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProjectMemberFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          findMany: {
            args: Prisma.ProjectMemberFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          create: {
            args: Prisma.ProjectMemberCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          createMany: {
            args: Prisma.ProjectMemberCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProjectMemberCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          delete: {
            args: Prisma.ProjectMemberDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          update: {
            args: Prisma.ProjectMemberUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          deleteMany: {
            args: Prisma.ProjectMemberDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProjectMemberUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProjectMemberUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          upsert: {
            args: Prisma.ProjectMemberUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          aggregate: {
            args: Prisma.ProjectMemberAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProjectMember>
          }
          groupBy: {
            args: Prisma.ProjectMemberGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProjectMemberGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProjectMemberCountArgs<ExtArgs>
            result: $Utils.Optional<ProjectMemberCountAggregateOutputType> | number
          }
        }
      }
      Repository: {
        payload: Prisma.$RepositoryPayload<ExtArgs>
        fields: Prisma.RepositoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RepositoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RepositoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          findFirst: {
            args: Prisma.RepositoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RepositoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          findMany: {
            args: Prisma.RepositoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>[]
          }
          create: {
            args: Prisma.RepositoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          createMany: {
            args: Prisma.RepositoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RepositoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>[]
          }
          delete: {
            args: Prisma.RepositoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          update: {
            args: Prisma.RepositoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          deleteMany: {
            args: Prisma.RepositoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RepositoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RepositoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>[]
          }
          upsert: {
            args: Prisma.RepositoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RepositoryPayload>
          }
          aggregate: {
            args: Prisma.RepositoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRepository>
          }
          groupBy: {
            args: Prisma.RepositoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<RepositoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.RepositoryCountArgs<ExtArgs>
            result: $Utils.Optional<RepositoryCountAggregateOutputType> | number
          }
        }
      }
      Document: {
        payload: Prisma.$DocumentPayload<ExtArgs>
        fields: Prisma.DocumentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DocumentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DocumentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          findFirst: {
            args: Prisma.DocumentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DocumentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          findMany: {
            args: Prisma.DocumentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>[]
          }
          create: {
            args: Prisma.DocumentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          createMany: {
            args: Prisma.DocumentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DocumentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>[]
          }
          delete: {
            args: Prisma.DocumentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          update: {
            args: Prisma.DocumentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          deleteMany: {
            args: Prisma.DocumentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DocumentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DocumentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>[]
          }
          upsert: {
            args: Prisma.DocumentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentPayload>
          }
          aggregate: {
            args: Prisma.DocumentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDocument>
          }
          groupBy: {
            args: Prisma.DocumentGroupByArgs<ExtArgs>
            result: $Utils.Optional<DocumentGroupByOutputType>[]
          }
          count: {
            args: Prisma.DocumentCountArgs<ExtArgs>
            result: $Utils.Optional<DocumentCountAggregateOutputType> | number
          }
        }
      }
      DocumentVersion: {
        payload: Prisma.$DocumentVersionPayload<ExtArgs>
        fields: Prisma.DocumentVersionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DocumentVersionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DocumentVersionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          findFirst: {
            args: Prisma.DocumentVersionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DocumentVersionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          findMany: {
            args: Prisma.DocumentVersionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>[]
          }
          create: {
            args: Prisma.DocumentVersionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          createMany: {
            args: Prisma.DocumentVersionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DocumentVersionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>[]
          }
          delete: {
            args: Prisma.DocumentVersionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          update: {
            args: Prisma.DocumentVersionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          deleteMany: {
            args: Prisma.DocumentVersionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DocumentVersionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DocumentVersionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>[]
          }
          upsert: {
            args: Prisma.DocumentVersionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentVersionPayload>
          }
          aggregate: {
            args: Prisma.DocumentVersionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDocumentVersion>
          }
          groupBy: {
            args: Prisma.DocumentVersionGroupByArgs<ExtArgs>
            result: $Utils.Optional<DocumentVersionGroupByOutputType>[]
          }
          count: {
            args: Prisma.DocumentVersionCountArgs<ExtArgs>
            result: $Utils.Optional<DocumentVersionCountAggregateOutputType> | number
          }
        }
      }
      AiRequest: {
        payload: Prisma.$AiRequestPayload<ExtArgs>
        fields: Prisma.AiRequestFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiRequestFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiRequestFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          findFirst: {
            args: Prisma.AiRequestFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiRequestFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          findMany: {
            args: Prisma.AiRequestFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>[]
          }
          create: {
            args: Prisma.AiRequestCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          createMany: {
            args: Prisma.AiRequestCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiRequestCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>[]
          }
          delete: {
            args: Prisma.AiRequestDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          update: {
            args: Prisma.AiRequestUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          deleteMany: {
            args: Prisma.AiRequestDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiRequestUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiRequestUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>[]
          }
          upsert: {
            args: Prisma.AiRequestUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiRequestPayload>
          }
          aggregate: {
            args: Prisma.AiRequestAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiRequest>
          }
          groupBy: {
            args: Prisma.AiRequestGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiRequestGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiRequestCountArgs<ExtArgs>
            result: $Utils.Optional<AiRequestCountAggregateOutputType> | number
          }
        }
      }
      AiResponse: {
        payload: Prisma.$AiResponsePayload<ExtArgs>
        fields: Prisma.AiResponseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AiResponseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AiResponseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          findFirst: {
            args: Prisma.AiResponseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AiResponseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          findMany: {
            args: Prisma.AiResponseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>[]
          }
          create: {
            args: Prisma.AiResponseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          createMany: {
            args: Prisma.AiResponseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AiResponseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>[]
          }
          delete: {
            args: Prisma.AiResponseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          update: {
            args: Prisma.AiResponseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          deleteMany: {
            args: Prisma.AiResponseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AiResponseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AiResponseUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>[]
          }
          upsert: {
            args: Prisma.AiResponseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AiResponsePayload>
          }
          aggregate: {
            args: Prisma.AiResponseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAiResponse>
          }
          groupBy: {
            args: Prisma.AiResponseGroupByArgs<ExtArgs>
            result: $Utils.Optional<AiResponseGroupByOutputType>[]
          }
          count: {
            args: Prisma.AiResponseCountArgs<ExtArgs>
            result: $Utils.Optional<AiResponseCountAggregateOutputType> | number
          }
        }
      }
      UsageTracking: {
        payload: Prisma.$UsageTrackingPayload<ExtArgs>
        fields: Prisma.UsageTrackingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UsageTrackingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UsageTrackingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          findFirst: {
            args: Prisma.UsageTrackingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UsageTrackingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          findMany: {
            args: Prisma.UsageTrackingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>[]
          }
          create: {
            args: Prisma.UsageTrackingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          createMany: {
            args: Prisma.UsageTrackingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UsageTrackingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>[]
          }
          delete: {
            args: Prisma.UsageTrackingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          update: {
            args: Prisma.UsageTrackingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          deleteMany: {
            args: Prisma.UsageTrackingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UsageTrackingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UsageTrackingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>[]
          }
          upsert: {
            args: Prisma.UsageTrackingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageTrackingPayload>
          }
          aggregate: {
            args: Prisma.UsageTrackingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsageTracking>
          }
          groupBy: {
            args: Prisma.UsageTrackingGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsageTrackingGroupByOutputType>[]
          }
          count: {
            args: Prisma.UsageTrackingCountArgs<ExtArgs>
            result: $Utils.Optional<UsageTrackingCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    userSession?: UserSessionOmit
    apiKey?: ApiKeyOmit
    project?: ProjectOmit
    projectMember?: ProjectMemberOmit
    repository?: RepositoryOmit
    document?: DocumentOmit
    documentVersion?: DocumentVersionOmit
    aiRequest?: AiRequestOmit
    aiResponse?: AiResponseOmit
    usageTracking?: UsageTrackingOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    user_sessions: number
    api_keys: number
    project_members: number
    documents: number
    document_versions: number
    ai_requests: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user_sessions?: boolean | UserCountOutputTypeCountUser_sessionsArgs
    api_keys?: boolean | UserCountOutputTypeCountApi_keysArgs
    project_members?: boolean | UserCountOutputTypeCountProject_membersArgs
    documents?: boolean | UserCountOutputTypeCountDocumentsArgs
    document_versions?: boolean | UserCountOutputTypeCountDocument_versionsArgs
    ai_requests?: boolean | UserCountOutputTypeCountAi_requestsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUser_sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountApi_keysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApiKeyWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountProject_membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountDocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountDocument_versionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentVersionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAi_requestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiRequestWhereInput
  }


  /**
   * Count Type ProjectCountOutputType
   */

  export type ProjectCountOutputType = {
    project_members: number
    documents: number
    ai_requests: number
  }

  export type ProjectCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project_members?: boolean | ProjectCountOutputTypeCountProject_membersArgs
    documents?: boolean | ProjectCountOutputTypeCountDocumentsArgs
    ai_requests?: boolean | ProjectCountOutputTypeCountAi_requestsArgs
  }

  // Custom InputTypes
  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectCountOutputType
     */
    select?: ProjectCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeCountProject_membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
  }

  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeCountDocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentWhereInput
  }

  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeCountAi_requestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiRequestWhereInput
  }


  /**
   * Count Type DocumentCountOutputType
   */

  export type DocumentCountOutputType = {
    versions: number
  }

  export type DocumentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    versions?: boolean | DocumentCountOutputTypeCountVersionsArgs
  }

  // Custom InputTypes
  /**
   * DocumentCountOutputType without action
   */
  export type DocumentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentCountOutputType
     */
    select?: DocumentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * DocumentCountOutputType without action
   */
  export type DocumentCountOutputTypeCountVersionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentVersionWhereInput
  }


  /**
   * Count Type AiRequestCountOutputType
   */

  export type AiRequestCountOutputType = {
    responses: number
    usage: number
  }

  export type AiRequestCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    responses?: boolean | AiRequestCountOutputTypeCountResponsesArgs
    usage?: boolean | AiRequestCountOutputTypeCountUsageArgs
  }

  // Custom InputTypes
  /**
   * AiRequestCountOutputType without action
   */
  export type AiRequestCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequestCountOutputType
     */
    select?: AiRequestCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AiRequestCountOutputType without action
   */
  export type AiRequestCountOutputTypeCountResponsesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiResponseWhereInput
  }

  /**
   * AiRequestCountOutputType without action
   */
  export type AiRequestCountOutputTypeCountUsageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsageTrackingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    github_id: number | null
  }

  export type UserSumAggregateOutputType = {
    github_id: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    github_id: number | null
    github_username: string | null
    name: string | null
    avatar_url: string | null
    bio: string | null
    company: string | null
    location: string | null
    timezone: string | null
    locale: string | null
    first_login_at: Date | null
    last_login_at: Date | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    github_id: number | null
    github_username: string | null
    name: string | null
    avatar_url: string | null
    bio: string | null
    company: string | null
    location: string | null
    timezone: string | null
    locale: string | null
    first_login_at: Date | null
    last_login_at: Date | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    github_id: number
    github_username: number
    name: number
    avatar_url: number
    bio: number
    company: number
    location: number
    timezone: number
    locale: number
    first_login_at: number
    last_login_at: number
    is_active: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    github_id?: true
  }

  export type UserSumAggregateInputType = {
    github_id?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    github_id?: true
    github_username?: true
    name?: true
    avatar_url?: true
    bio?: true
    company?: true
    location?: true
    timezone?: true
    locale?: true
    first_login_at?: true
    last_login_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    github_id?: true
    github_username?: true
    name?: true
    avatar_url?: true
    bio?: true
    company?: true
    location?: true
    timezone?: true
    locale?: true
    first_login_at?: true
    last_login_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    github_id?: true
    github_username?: true
    name?: true
    avatar_url?: true
    bio?: true
    company?: true
    location?: true
    timezone?: true
    locale?: true
    first_login_at?: true
    last_login_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url: string | null
    bio: string | null
    company: string | null
    location: string | null
    timezone: string
    locale: string
    first_login_at: Date | null
    last_login_at: Date | null
    is_active: boolean
    created_at: Date
    updated_at: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    github_id?: boolean
    github_username?: boolean
    name?: boolean
    avatar_url?: boolean
    bio?: boolean
    company?: boolean
    location?: boolean
    timezone?: boolean
    locale?: boolean
    first_login_at?: boolean
    last_login_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
    user_sessions?: boolean | User$user_sessionsArgs<ExtArgs>
    api_keys?: boolean | User$api_keysArgs<ExtArgs>
    project_members?: boolean | User$project_membersArgs<ExtArgs>
    documents?: boolean | User$documentsArgs<ExtArgs>
    document_versions?: boolean | User$document_versionsArgs<ExtArgs>
    ai_requests?: boolean | User$ai_requestsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    github_id?: boolean
    github_username?: boolean
    name?: boolean
    avatar_url?: boolean
    bio?: boolean
    company?: boolean
    location?: boolean
    timezone?: boolean
    locale?: boolean
    first_login_at?: boolean
    last_login_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    github_id?: boolean
    github_username?: boolean
    name?: boolean
    avatar_url?: boolean
    bio?: boolean
    company?: boolean
    location?: boolean
    timezone?: boolean
    locale?: boolean
    first_login_at?: boolean
    last_login_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    github_id?: boolean
    github_username?: boolean
    name?: boolean
    avatar_url?: boolean
    bio?: boolean
    company?: boolean
    location?: boolean
    timezone?: boolean
    locale?: boolean
    first_login_at?: boolean
    last_login_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "github_id" | "github_username" | "name" | "avatar_url" | "bio" | "company" | "location" | "timezone" | "locale" | "first_login_at" | "last_login_at" | "is_active" | "created_at" | "updated_at", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user_sessions?: boolean | User$user_sessionsArgs<ExtArgs>
    api_keys?: boolean | User$api_keysArgs<ExtArgs>
    project_members?: boolean | User$project_membersArgs<ExtArgs>
    documents?: boolean | User$documentsArgs<ExtArgs>
    document_versions?: boolean | User$document_versionsArgs<ExtArgs>
    ai_requests?: boolean | User$ai_requestsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      user_sessions: Prisma.$UserSessionPayload<ExtArgs>[]
      api_keys: Prisma.$ApiKeyPayload<ExtArgs>[]
      project_members: Prisma.$ProjectMemberPayload<ExtArgs>[]
      documents: Prisma.$DocumentPayload<ExtArgs>[]
      document_versions: Prisma.$DocumentVersionPayload<ExtArgs>[]
      ai_requests: Prisma.$AiRequestPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      github_id: number
      github_username: string
      name: string
      avatar_url: string | null
      bio: string | null
      company: string | null
      location: string | null
      timezone: string
      locale: string
      first_login_at: Date | null
      last_login_at: Date | null
      is_active: boolean
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user_sessions<T extends User$user_sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$user_sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    api_keys<T extends User$api_keysArgs<ExtArgs> = {}>(args?: Subset<T, User$api_keysArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    project_members<T extends User$project_membersArgs<ExtArgs> = {}>(args?: Subset<T, User$project_membersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    documents<T extends User$documentsArgs<ExtArgs> = {}>(args?: Subset<T, User$documentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    document_versions<T extends User$document_versionsArgs<ExtArgs> = {}>(args?: Subset<T, User$document_versionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    ai_requests<T extends User$ai_requestsArgs<ExtArgs> = {}>(args?: Subset<T, User$ai_requestsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly github_id: FieldRef<"User", 'Int'>
    readonly github_username: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly avatar_url: FieldRef<"User", 'String'>
    readonly bio: FieldRef<"User", 'String'>
    readonly company: FieldRef<"User", 'String'>
    readonly location: FieldRef<"User", 'String'>
    readonly timezone: FieldRef<"User", 'String'>
    readonly locale: FieldRef<"User", 'String'>
    readonly first_login_at: FieldRef<"User", 'DateTime'>
    readonly last_login_at: FieldRef<"User", 'DateTime'>
    readonly is_active: FieldRef<"User", 'Boolean'>
    readonly created_at: FieldRef<"User", 'DateTime'>
    readonly updated_at: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.user_sessions
   */
  export type User$user_sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    where?: UserSessionWhereInput
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    cursor?: UserSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * User.api_keys
   */
  export type User$api_keysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    where?: ApiKeyWhereInput
    orderBy?: ApiKeyOrderByWithRelationInput | ApiKeyOrderByWithRelationInput[]
    cursor?: ApiKeyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ApiKeyScalarFieldEnum | ApiKeyScalarFieldEnum[]
  }

  /**
   * User.project_members
   */
  export type User$project_membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    cursor?: ProjectMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * User.documents
   */
  export type User$documentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    where?: DocumentWhereInput
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    cursor?: DocumentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentScalarFieldEnum | DocumentScalarFieldEnum[]
  }

  /**
   * User.document_versions
   */
  export type User$document_versionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    where?: DocumentVersionWhereInput
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    cursor?: DocumentVersionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentVersionScalarFieldEnum | DocumentVersionScalarFieldEnum[]
  }

  /**
   * User.ai_requests
   */
  export type User$ai_requestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    where?: AiRequestWhereInput
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    cursor?: AiRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiRequestScalarFieldEnum | AiRequestScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model UserSession
   */

  export type AggregateUserSession = {
    _count: UserSessionCountAggregateOutputType | null
    _min: UserSessionMinAggregateOutputType | null
    _max: UserSessionMaxAggregateOutputType | null
  }

  export type UserSessionMinAggregateOutputType = {
    id: string | null
    user_id: string | null
    session_id: string | null
    access_token: string | null
    refresh_token: string | null
    expires_at: Date | null
    ip_address: string | null
    user_agent: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type UserSessionMaxAggregateOutputType = {
    id: string | null
    user_id: string | null
    session_id: string | null
    access_token: string | null
    refresh_token: string | null
    expires_at: Date | null
    ip_address: string | null
    user_agent: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type UserSessionCountAggregateOutputType = {
    id: number
    user_id: number
    session_id: number
    access_token: number
    refresh_token: number
    expires_at: number
    ip_address: number
    user_agent: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type UserSessionMinAggregateInputType = {
    id?: true
    user_id?: true
    session_id?: true
    access_token?: true
    refresh_token?: true
    expires_at?: true
    ip_address?: true
    user_agent?: true
    created_at?: true
    updated_at?: true
  }

  export type UserSessionMaxAggregateInputType = {
    id?: true
    user_id?: true
    session_id?: true
    access_token?: true
    refresh_token?: true
    expires_at?: true
    ip_address?: true
    user_agent?: true
    created_at?: true
    updated_at?: true
  }

  export type UserSessionCountAggregateInputType = {
    id?: true
    user_id?: true
    session_id?: true
    access_token?: true
    refresh_token?: true
    expires_at?: true
    ip_address?: true
    user_agent?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type UserSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSession to aggregate.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserSessions
    **/
    _count?: true | UserSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserSessionMaxAggregateInputType
  }

  export type GetUserSessionAggregateType<T extends UserSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateUserSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserSession[P]>
      : GetScalarType<T[P], AggregateUserSession[P]>
  }




  export type UserSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSessionWhereInput
    orderBy?: UserSessionOrderByWithAggregationInput | UserSessionOrderByWithAggregationInput[]
    by: UserSessionScalarFieldEnum[] | UserSessionScalarFieldEnum
    having?: UserSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserSessionCountAggregateInputType | true
    _min?: UserSessionMinAggregateInputType
    _max?: UserSessionMaxAggregateInputType
  }

  export type UserSessionGroupByOutputType = {
    id: string
    user_id: string
    session_id: string
    access_token: string
    refresh_token: string | null
    expires_at: Date
    ip_address: string | null
    user_agent: string | null
    created_at: Date
    updated_at: Date
    _count: UserSessionCountAggregateOutputType | null
    _min: UserSessionMinAggregateOutputType | null
    _max: UserSessionMaxAggregateOutputType | null
  }

  type GetUserSessionGroupByPayload<T extends UserSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserSessionGroupByOutputType[P]>
            : GetScalarType<T[P], UserSessionGroupByOutputType[P]>
        }
      >
    >


  export type UserSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    session_id?: boolean
    access_token?: boolean
    refresh_token?: boolean
    expires_at?: boolean
    ip_address?: boolean
    user_agent?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    session_id?: boolean
    access_token?: boolean
    refresh_token?: boolean
    expires_at?: boolean
    ip_address?: boolean
    user_agent?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    session_id?: boolean
    access_token?: boolean
    refresh_token?: boolean
    expires_at?: boolean
    ip_address?: boolean
    user_agent?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectScalar = {
    id?: boolean
    user_id?: boolean
    session_id?: boolean
    access_token?: boolean
    refresh_token?: boolean
    expires_at?: boolean
    ip_address?: boolean
    user_agent?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type UserSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "user_id" | "session_id" | "access_token" | "refresh_token" | "expires_at" | "ip_address" | "user_agent" | "created_at" | "updated_at", ExtArgs["result"]["userSession"]>
  export type UserSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserSession"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      user_id: string
      session_id: string
      access_token: string
      refresh_token: string | null
      expires_at: Date
      ip_address: string | null
      user_agent: string | null
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["userSession"]>
    composites: {}
  }

  type UserSessionGetPayload<S extends boolean | null | undefined | UserSessionDefaultArgs> = $Result.GetResult<Prisma.$UserSessionPayload, S>

  type UserSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserSessionCountAggregateInputType | true
    }

  export interface UserSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserSession'], meta: { name: 'UserSession' } }
    /**
     * Find zero or one UserSession that matches the filter.
     * @param {UserSessionFindUniqueArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserSessionFindUniqueArgs>(args: SelectSubset<T, UserSessionFindUniqueArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserSessionFindUniqueOrThrowArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, UserSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindFirstArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserSessionFindFirstArgs>(args?: SelectSubset<T, UserSessionFindFirstArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindFirstOrThrowArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, UserSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserSessions
     * const userSessions = await prisma.userSession.findMany()
     * 
     * // Get first 10 UserSessions
     * const userSessions = await prisma.userSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userSessionWithIdOnly = await prisma.userSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserSessionFindManyArgs>(args?: SelectSubset<T, UserSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserSession.
     * @param {UserSessionCreateArgs} args - Arguments to create a UserSession.
     * @example
     * // Create one UserSession
     * const UserSession = await prisma.userSession.create({
     *   data: {
     *     // ... data to create a UserSession
     *   }
     * })
     * 
     */
    create<T extends UserSessionCreateArgs>(args: SelectSubset<T, UserSessionCreateArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserSessions.
     * @param {UserSessionCreateManyArgs} args - Arguments to create many UserSessions.
     * @example
     * // Create many UserSessions
     * const userSession = await prisma.userSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserSessionCreateManyArgs>(args?: SelectSubset<T, UserSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserSessions and returns the data saved in the database.
     * @param {UserSessionCreateManyAndReturnArgs} args - Arguments to create many UserSessions.
     * @example
     * // Create many UserSessions
     * const userSession = await prisma.userSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserSessions and only return the `id`
     * const userSessionWithIdOnly = await prisma.userSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, UserSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserSession.
     * @param {UserSessionDeleteArgs} args - Arguments to delete one UserSession.
     * @example
     * // Delete one UserSession
     * const UserSession = await prisma.userSession.delete({
     *   where: {
     *     // ... filter to delete one UserSession
     *   }
     * })
     * 
     */
    delete<T extends UserSessionDeleteArgs>(args: SelectSubset<T, UserSessionDeleteArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserSession.
     * @param {UserSessionUpdateArgs} args - Arguments to update one UserSession.
     * @example
     * // Update one UserSession
     * const userSession = await prisma.userSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserSessionUpdateArgs>(args: SelectSubset<T, UserSessionUpdateArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserSessions.
     * @param {UserSessionDeleteManyArgs} args - Arguments to filter UserSessions to delete.
     * @example
     * // Delete a few UserSessions
     * const { count } = await prisma.userSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserSessionDeleteManyArgs>(args?: SelectSubset<T, UserSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserSessions
     * const userSession = await prisma.userSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserSessionUpdateManyArgs>(args: SelectSubset<T, UserSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSessions and returns the data updated in the database.
     * @param {UserSessionUpdateManyAndReturnArgs} args - Arguments to update many UserSessions.
     * @example
     * // Update many UserSessions
     * const userSession = await prisma.userSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserSessions and only return the `id`
     * const userSessionWithIdOnly = await prisma.userSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, UserSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserSession.
     * @param {UserSessionUpsertArgs} args - Arguments to update or create a UserSession.
     * @example
     * // Update or create a UserSession
     * const userSession = await prisma.userSession.upsert({
     *   create: {
     *     // ... data to create a UserSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserSession we want to update
     *   }
     * })
     */
    upsert<T extends UserSessionUpsertArgs>(args: SelectSubset<T, UserSessionUpsertArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionCountArgs} args - Arguments to filter UserSessions to count.
     * @example
     * // Count the number of UserSessions
     * const count = await prisma.userSession.count({
     *   where: {
     *     // ... the filter for the UserSessions we want to count
     *   }
     * })
    **/
    count<T extends UserSessionCountArgs>(
      args?: Subset<T, UserSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserSessionAggregateArgs>(args: Subset<T, UserSessionAggregateArgs>): Prisma.PrismaPromise<GetUserSessionAggregateType<T>>

    /**
     * Group by UserSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserSessionGroupByArgs['orderBy'] }
        : { orderBy?: UserSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserSession model
   */
  readonly fields: UserSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserSession model
   */
  interface UserSessionFieldRefs {
    readonly id: FieldRef<"UserSession", 'String'>
    readonly user_id: FieldRef<"UserSession", 'String'>
    readonly session_id: FieldRef<"UserSession", 'String'>
    readonly access_token: FieldRef<"UserSession", 'String'>
    readonly refresh_token: FieldRef<"UserSession", 'String'>
    readonly expires_at: FieldRef<"UserSession", 'DateTime'>
    readonly ip_address: FieldRef<"UserSession", 'String'>
    readonly user_agent: FieldRef<"UserSession", 'String'>
    readonly created_at: FieldRef<"UserSession", 'DateTime'>
    readonly updated_at: FieldRef<"UserSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserSession findUnique
   */
  export type UserSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession findUniqueOrThrow
   */
  export type UserSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession findFirst
   */
  export type UserSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSessions.
     */
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession findFirstOrThrow
   */
  export type UserSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSessions.
     */
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession findMany
   */
  export type UserSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSessions to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession create
   */
  export type UserSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a UserSession.
     */
    data: XOR<UserSessionCreateInput, UserSessionUncheckedCreateInput>
  }

  /**
   * UserSession createMany
   */
  export type UserSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserSessions.
     */
    data: UserSessionCreateManyInput | UserSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserSession createManyAndReturn
   */
  export type UserSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * The data used to create many UserSessions.
     */
    data: UserSessionCreateManyInput | UserSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSession update
   */
  export type UserSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a UserSession.
     */
    data: XOR<UserSessionUpdateInput, UserSessionUncheckedUpdateInput>
    /**
     * Choose, which UserSession to update.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession updateMany
   */
  export type UserSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserSessions.
     */
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyInput>
    /**
     * Filter which UserSessions to update
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to update.
     */
    limit?: number
  }

  /**
   * UserSession updateManyAndReturn
   */
  export type UserSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * The data used to update UserSessions.
     */
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyInput>
    /**
     * Filter which UserSessions to update
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSession upsert
   */
  export type UserSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the UserSession to update in case it exists.
     */
    where: UserSessionWhereUniqueInput
    /**
     * In case the UserSession found by the `where` argument doesn't exist, create a new UserSession with this data.
     */
    create: XOR<UserSessionCreateInput, UserSessionUncheckedCreateInput>
    /**
     * In case the UserSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserSessionUpdateInput, UserSessionUncheckedUpdateInput>
  }

  /**
   * UserSession delete
   */
  export type UserSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter which UserSession to delete.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession deleteMany
   */
  export type UserSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSessions to delete
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to delete.
     */
    limit?: number
  }

  /**
   * UserSession without action
   */
  export type UserSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
  }


  /**
   * Model ApiKey
   */

  export type AggregateApiKey = {
    _count: ApiKeyCountAggregateOutputType | null
    _min: ApiKeyMinAggregateOutputType | null
    _max: ApiKeyMaxAggregateOutputType | null
  }

  export type ApiKeyMinAggregateOutputType = {
    id: string | null
    user_id: string | null
    name: string | null
    key_hash: string | null
    last_used_at: Date | null
    expires_at: Date | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ApiKeyMaxAggregateOutputType = {
    id: string | null
    user_id: string | null
    name: string | null
    key_hash: string | null
    last_used_at: Date | null
    expires_at: Date | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ApiKeyCountAggregateOutputType = {
    id: number
    user_id: number
    name: number
    key_hash: number
    permissions: number
    last_used_at: number
    expires_at: number
    is_active: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type ApiKeyMinAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    key_hash?: true
    last_used_at?: true
    expires_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type ApiKeyMaxAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    key_hash?: true
    last_used_at?: true
    expires_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type ApiKeyCountAggregateInputType = {
    id?: true
    user_id?: true
    name?: true
    key_hash?: true
    permissions?: true
    last_used_at?: true
    expires_at?: true
    is_active?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type ApiKeyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApiKey to aggregate.
     */
    where?: ApiKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiKeys to fetch.
     */
    orderBy?: ApiKeyOrderByWithRelationInput | ApiKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApiKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ApiKeys
    **/
    _count?: true | ApiKeyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApiKeyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApiKeyMaxAggregateInputType
  }

  export type GetApiKeyAggregateType<T extends ApiKeyAggregateArgs> = {
        [P in keyof T & keyof AggregateApiKey]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApiKey[P]>
      : GetScalarType<T[P], AggregateApiKey[P]>
  }




  export type ApiKeyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApiKeyWhereInput
    orderBy?: ApiKeyOrderByWithAggregationInput | ApiKeyOrderByWithAggregationInput[]
    by: ApiKeyScalarFieldEnum[] | ApiKeyScalarFieldEnum
    having?: ApiKeyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApiKeyCountAggregateInputType | true
    _min?: ApiKeyMinAggregateInputType
    _max?: ApiKeyMaxAggregateInputType
  }

  export type ApiKeyGroupByOutputType = {
    id: string
    user_id: string
    name: string
    key_hash: string
    permissions: JsonValue
    last_used_at: Date | null
    expires_at: Date | null
    is_active: boolean
    created_at: Date
    updated_at: Date
    _count: ApiKeyCountAggregateOutputType | null
    _min: ApiKeyMinAggregateOutputType | null
    _max: ApiKeyMaxAggregateOutputType | null
  }

  type GetApiKeyGroupByPayload<T extends ApiKeyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApiKeyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApiKeyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApiKeyGroupByOutputType[P]>
            : GetScalarType<T[P], ApiKeyGroupByOutputType[P]>
        }
      >
    >


  export type ApiKeySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    key_hash?: boolean
    permissions?: boolean
    last_used_at?: boolean
    expires_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["apiKey"]>

  export type ApiKeySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    key_hash?: boolean
    permissions?: boolean
    last_used_at?: boolean
    expires_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["apiKey"]>

  export type ApiKeySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    name?: boolean
    key_hash?: boolean
    permissions?: boolean
    last_used_at?: boolean
    expires_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["apiKey"]>

  export type ApiKeySelectScalar = {
    id?: boolean
    user_id?: boolean
    name?: boolean
    key_hash?: boolean
    permissions?: boolean
    last_used_at?: boolean
    expires_at?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type ApiKeyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "user_id" | "name" | "key_hash" | "permissions" | "last_used_at" | "expires_at" | "is_active" | "created_at" | "updated_at", ExtArgs["result"]["apiKey"]>
  export type ApiKeyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ApiKeyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ApiKeyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ApiKeyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ApiKey"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      user_id: string
      name: string
      key_hash: string
      permissions: Prisma.JsonValue
      last_used_at: Date | null
      expires_at: Date | null
      is_active: boolean
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["apiKey"]>
    composites: {}
  }

  type ApiKeyGetPayload<S extends boolean | null | undefined | ApiKeyDefaultArgs> = $Result.GetResult<Prisma.$ApiKeyPayload, S>

  type ApiKeyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ApiKeyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ApiKeyCountAggregateInputType | true
    }

  export interface ApiKeyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ApiKey'], meta: { name: 'ApiKey' } }
    /**
     * Find zero or one ApiKey that matches the filter.
     * @param {ApiKeyFindUniqueArgs} args - Arguments to find a ApiKey
     * @example
     * // Get one ApiKey
     * const apiKey = await prisma.apiKey.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApiKeyFindUniqueArgs>(args: SelectSubset<T, ApiKeyFindUniqueArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ApiKey that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ApiKeyFindUniqueOrThrowArgs} args - Arguments to find a ApiKey
     * @example
     * // Get one ApiKey
     * const apiKey = await prisma.apiKey.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApiKeyFindUniqueOrThrowArgs>(args: SelectSubset<T, ApiKeyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApiKey that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyFindFirstArgs} args - Arguments to find a ApiKey
     * @example
     * // Get one ApiKey
     * const apiKey = await prisma.apiKey.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApiKeyFindFirstArgs>(args?: SelectSubset<T, ApiKeyFindFirstArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApiKey that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyFindFirstOrThrowArgs} args - Arguments to find a ApiKey
     * @example
     * // Get one ApiKey
     * const apiKey = await prisma.apiKey.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApiKeyFindFirstOrThrowArgs>(args?: SelectSubset<T, ApiKeyFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ApiKeys that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ApiKeys
     * const apiKeys = await prisma.apiKey.findMany()
     * 
     * // Get first 10 ApiKeys
     * const apiKeys = await prisma.apiKey.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const apiKeyWithIdOnly = await prisma.apiKey.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApiKeyFindManyArgs>(args?: SelectSubset<T, ApiKeyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ApiKey.
     * @param {ApiKeyCreateArgs} args - Arguments to create a ApiKey.
     * @example
     * // Create one ApiKey
     * const ApiKey = await prisma.apiKey.create({
     *   data: {
     *     // ... data to create a ApiKey
     *   }
     * })
     * 
     */
    create<T extends ApiKeyCreateArgs>(args: SelectSubset<T, ApiKeyCreateArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ApiKeys.
     * @param {ApiKeyCreateManyArgs} args - Arguments to create many ApiKeys.
     * @example
     * // Create many ApiKeys
     * const apiKey = await prisma.apiKey.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApiKeyCreateManyArgs>(args?: SelectSubset<T, ApiKeyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ApiKeys and returns the data saved in the database.
     * @param {ApiKeyCreateManyAndReturnArgs} args - Arguments to create many ApiKeys.
     * @example
     * // Create many ApiKeys
     * const apiKey = await prisma.apiKey.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ApiKeys and only return the `id`
     * const apiKeyWithIdOnly = await prisma.apiKey.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApiKeyCreateManyAndReturnArgs>(args?: SelectSubset<T, ApiKeyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ApiKey.
     * @param {ApiKeyDeleteArgs} args - Arguments to delete one ApiKey.
     * @example
     * // Delete one ApiKey
     * const ApiKey = await prisma.apiKey.delete({
     *   where: {
     *     // ... filter to delete one ApiKey
     *   }
     * })
     * 
     */
    delete<T extends ApiKeyDeleteArgs>(args: SelectSubset<T, ApiKeyDeleteArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ApiKey.
     * @param {ApiKeyUpdateArgs} args - Arguments to update one ApiKey.
     * @example
     * // Update one ApiKey
     * const apiKey = await prisma.apiKey.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApiKeyUpdateArgs>(args: SelectSubset<T, ApiKeyUpdateArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ApiKeys.
     * @param {ApiKeyDeleteManyArgs} args - Arguments to filter ApiKeys to delete.
     * @example
     * // Delete a few ApiKeys
     * const { count } = await prisma.apiKey.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApiKeyDeleteManyArgs>(args?: SelectSubset<T, ApiKeyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApiKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ApiKeys
     * const apiKey = await prisma.apiKey.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApiKeyUpdateManyArgs>(args: SelectSubset<T, ApiKeyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApiKeys and returns the data updated in the database.
     * @param {ApiKeyUpdateManyAndReturnArgs} args - Arguments to update many ApiKeys.
     * @example
     * // Update many ApiKeys
     * const apiKey = await prisma.apiKey.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ApiKeys and only return the `id`
     * const apiKeyWithIdOnly = await prisma.apiKey.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ApiKeyUpdateManyAndReturnArgs>(args: SelectSubset<T, ApiKeyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ApiKey.
     * @param {ApiKeyUpsertArgs} args - Arguments to update or create a ApiKey.
     * @example
     * // Update or create a ApiKey
     * const apiKey = await prisma.apiKey.upsert({
     *   create: {
     *     // ... data to create a ApiKey
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ApiKey we want to update
     *   }
     * })
     */
    upsert<T extends ApiKeyUpsertArgs>(args: SelectSubset<T, ApiKeyUpsertArgs<ExtArgs>>): Prisma__ApiKeyClient<$Result.GetResult<Prisma.$ApiKeyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ApiKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyCountArgs} args - Arguments to filter ApiKeys to count.
     * @example
     * // Count the number of ApiKeys
     * const count = await prisma.apiKey.count({
     *   where: {
     *     // ... the filter for the ApiKeys we want to count
     *   }
     * })
    **/
    count<T extends ApiKeyCountArgs>(
      args?: Subset<T, ApiKeyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApiKeyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ApiKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApiKeyAggregateArgs>(args: Subset<T, ApiKeyAggregateArgs>): Prisma.PrismaPromise<GetApiKeyAggregateType<T>>

    /**
     * Group by ApiKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiKeyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApiKeyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApiKeyGroupByArgs['orderBy'] }
        : { orderBy?: ApiKeyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApiKeyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApiKeyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ApiKey model
   */
  readonly fields: ApiKeyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ApiKey.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApiKeyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ApiKey model
   */
  interface ApiKeyFieldRefs {
    readonly id: FieldRef<"ApiKey", 'String'>
    readonly user_id: FieldRef<"ApiKey", 'String'>
    readonly name: FieldRef<"ApiKey", 'String'>
    readonly key_hash: FieldRef<"ApiKey", 'String'>
    readonly permissions: FieldRef<"ApiKey", 'Json'>
    readonly last_used_at: FieldRef<"ApiKey", 'DateTime'>
    readonly expires_at: FieldRef<"ApiKey", 'DateTime'>
    readonly is_active: FieldRef<"ApiKey", 'Boolean'>
    readonly created_at: FieldRef<"ApiKey", 'DateTime'>
    readonly updated_at: FieldRef<"ApiKey", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ApiKey findUnique
   */
  export type ApiKeyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter, which ApiKey to fetch.
     */
    where: ApiKeyWhereUniqueInput
  }

  /**
   * ApiKey findUniqueOrThrow
   */
  export type ApiKeyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter, which ApiKey to fetch.
     */
    where: ApiKeyWhereUniqueInput
  }

  /**
   * ApiKey findFirst
   */
  export type ApiKeyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter, which ApiKey to fetch.
     */
    where?: ApiKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiKeys to fetch.
     */
    orderBy?: ApiKeyOrderByWithRelationInput | ApiKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApiKeys.
     */
    cursor?: ApiKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApiKeys.
     */
    distinct?: ApiKeyScalarFieldEnum | ApiKeyScalarFieldEnum[]
  }

  /**
   * ApiKey findFirstOrThrow
   */
  export type ApiKeyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter, which ApiKey to fetch.
     */
    where?: ApiKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiKeys to fetch.
     */
    orderBy?: ApiKeyOrderByWithRelationInput | ApiKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApiKeys.
     */
    cursor?: ApiKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApiKeys.
     */
    distinct?: ApiKeyScalarFieldEnum | ApiKeyScalarFieldEnum[]
  }

  /**
   * ApiKey findMany
   */
  export type ApiKeyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter, which ApiKeys to fetch.
     */
    where?: ApiKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiKeys to fetch.
     */
    orderBy?: ApiKeyOrderByWithRelationInput | ApiKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ApiKeys.
     */
    cursor?: ApiKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiKeys.
     */
    skip?: number
    distinct?: ApiKeyScalarFieldEnum | ApiKeyScalarFieldEnum[]
  }

  /**
   * ApiKey create
   */
  export type ApiKeyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * The data needed to create a ApiKey.
     */
    data: XOR<ApiKeyCreateInput, ApiKeyUncheckedCreateInput>
  }

  /**
   * ApiKey createMany
   */
  export type ApiKeyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ApiKeys.
     */
    data: ApiKeyCreateManyInput | ApiKeyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ApiKey createManyAndReturn
   */
  export type ApiKeyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * The data used to create many ApiKeys.
     */
    data: ApiKeyCreateManyInput | ApiKeyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ApiKey update
   */
  export type ApiKeyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * The data needed to update a ApiKey.
     */
    data: XOR<ApiKeyUpdateInput, ApiKeyUncheckedUpdateInput>
    /**
     * Choose, which ApiKey to update.
     */
    where: ApiKeyWhereUniqueInput
  }

  /**
   * ApiKey updateMany
   */
  export type ApiKeyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ApiKeys.
     */
    data: XOR<ApiKeyUpdateManyMutationInput, ApiKeyUncheckedUpdateManyInput>
    /**
     * Filter which ApiKeys to update
     */
    where?: ApiKeyWhereInput
    /**
     * Limit how many ApiKeys to update.
     */
    limit?: number
  }

  /**
   * ApiKey updateManyAndReturn
   */
  export type ApiKeyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * The data used to update ApiKeys.
     */
    data: XOR<ApiKeyUpdateManyMutationInput, ApiKeyUncheckedUpdateManyInput>
    /**
     * Filter which ApiKeys to update
     */
    where?: ApiKeyWhereInput
    /**
     * Limit how many ApiKeys to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ApiKey upsert
   */
  export type ApiKeyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * The filter to search for the ApiKey to update in case it exists.
     */
    where: ApiKeyWhereUniqueInput
    /**
     * In case the ApiKey found by the `where` argument doesn't exist, create a new ApiKey with this data.
     */
    create: XOR<ApiKeyCreateInput, ApiKeyUncheckedCreateInput>
    /**
     * In case the ApiKey was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApiKeyUpdateInput, ApiKeyUncheckedUpdateInput>
  }

  /**
   * ApiKey delete
   */
  export type ApiKeyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
    /**
     * Filter which ApiKey to delete.
     */
    where: ApiKeyWhereUniqueInput
  }

  /**
   * ApiKey deleteMany
   */
  export type ApiKeyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApiKeys to delete
     */
    where?: ApiKeyWhereInput
    /**
     * Limit how many ApiKeys to delete.
     */
    limit?: number
  }

  /**
   * ApiKey without action
   */
  export type ApiKeyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiKey
     */
    select?: ApiKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiKey
     */
    omit?: ApiKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApiKeyInclude<ExtArgs> | null
  }


  /**
   * Model Project
   */

  export type AggregateProject = {
    _count: ProjectCountAggregateOutputType | null
    _avg: ProjectAvgAggregateOutputType | null
    _sum: ProjectSumAggregateOutputType | null
    _min: ProjectMinAggregateOutputType | null
    _max: ProjectMaxAggregateOutputType | null
  }

  export type ProjectAvgAggregateOutputType = {
    ai_budget: Decimal | null
  }

  export type ProjectSumAggregateOutputType = {
    ai_budget: Decimal | null
  }

  export type ProjectMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    status: $Enums.ProjectStatus | null
    repository_id: string | null
    ai_model: string | null
    ai_budget: Decimal | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ProjectMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    status: $Enums.ProjectStatus | null
    repository_id: string | null
    ai_model: string | null
    ai_budget: Decimal | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ProjectCountAggregateOutputType = {
    id: number
    name: number
    description: number
    status: number
    repository_id: number
    settings: number
    ai_model: number
    ai_budget: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type ProjectAvgAggregateInputType = {
    ai_budget?: true
  }

  export type ProjectSumAggregateInputType = {
    ai_budget?: true
  }

  export type ProjectMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    status?: true
    repository_id?: true
    ai_model?: true
    ai_budget?: true
    created_at?: true
    updated_at?: true
  }

  export type ProjectMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    status?: true
    repository_id?: true
    ai_model?: true
    ai_budget?: true
    created_at?: true
    updated_at?: true
  }

  export type ProjectCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    status?: true
    repository_id?: true
    settings?: true
    ai_model?: true
    ai_budget?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type ProjectAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Project to aggregate.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Projects
    **/
    _count?: true | ProjectCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProjectAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProjectSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProjectMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProjectMaxAggregateInputType
  }

  export type GetProjectAggregateType<T extends ProjectAggregateArgs> = {
        [P in keyof T & keyof AggregateProject]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProject[P]>
      : GetScalarType<T[P], AggregateProject[P]>
  }




  export type ProjectGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectWhereInput
    orderBy?: ProjectOrderByWithAggregationInput | ProjectOrderByWithAggregationInput[]
    by: ProjectScalarFieldEnum[] | ProjectScalarFieldEnum
    having?: ProjectScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProjectCountAggregateInputType | true
    _avg?: ProjectAvgAggregateInputType
    _sum?: ProjectSumAggregateInputType
    _min?: ProjectMinAggregateInputType
    _max?: ProjectMaxAggregateInputType
  }

  export type ProjectGroupByOutputType = {
    id: string
    name: string
    description: string | null
    status: $Enums.ProjectStatus
    repository_id: string | null
    settings: JsonValue
    ai_model: string
    ai_budget: Decimal | null
    created_at: Date
    updated_at: Date
    _count: ProjectCountAggregateOutputType | null
    _avg: ProjectAvgAggregateOutputType | null
    _sum: ProjectSumAggregateOutputType | null
    _min: ProjectMinAggregateOutputType | null
    _max: ProjectMaxAggregateOutputType | null
  }

  type GetProjectGroupByPayload<T extends ProjectGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProjectGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProjectGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProjectGroupByOutputType[P]>
            : GetScalarType<T[P], ProjectGroupByOutputType[P]>
        }
      >
    >


  export type ProjectSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    status?: boolean
    repository_id?: boolean
    settings?: boolean
    ai_model?: boolean
    ai_budget?: boolean
    created_at?: boolean
    updated_at?: boolean
    repository?: boolean | Project$repositoryArgs<ExtArgs>
    project_members?: boolean | Project$project_membersArgs<ExtArgs>
    documents?: boolean | Project$documentsArgs<ExtArgs>
    ai_requests?: boolean | Project$ai_requestsArgs<ExtArgs>
    _count?: boolean | ProjectCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    status?: boolean
    repository_id?: boolean
    settings?: boolean
    ai_model?: boolean
    ai_budget?: boolean
    created_at?: boolean
    updated_at?: boolean
    repository?: boolean | Project$repositoryArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    status?: boolean
    repository_id?: boolean
    settings?: boolean
    ai_model?: boolean
    ai_budget?: boolean
    created_at?: boolean
    updated_at?: boolean
    repository?: boolean | Project$repositoryArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    status?: boolean
    repository_id?: boolean
    settings?: boolean
    ai_model?: boolean
    ai_budget?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type ProjectOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "status" | "repository_id" | "settings" | "ai_model" | "ai_budget" | "created_at" | "updated_at", ExtArgs["result"]["project"]>
  export type ProjectInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    repository?: boolean | Project$repositoryArgs<ExtArgs>
    project_members?: boolean | Project$project_membersArgs<ExtArgs>
    documents?: boolean | Project$documentsArgs<ExtArgs>
    ai_requests?: boolean | Project$ai_requestsArgs<ExtArgs>
    _count?: boolean | ProjectCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ProjectIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    repository?: boolean | Project$repositoryArgs<ExtArgs>
  }
  export type ProjectIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    repository?: boolean | Project$repositoryArgs<ExtArgs>
  }

  export type $ProjectPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Project"
    objects: {
      repository: Prisma.$RepositoryPayload<ExtArgs> | null
      project_members: Prisma.$ProjectMemberPayload<ExtArgs>[]
      documents: Prisma.$DocumentPayload<ExtArgs>[]
      ai_requests: Prisma.$AiRequestPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      status: $Enums.ProjectStatus
      repository_id: string | null
      settings: Prisma.JsonValue
      ai_model: string
      ai_budget: Prisma.Decimal | null
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["project"]>
    composites: {}
  }

  type ProjectGetPayload<S extends boolean | null | undefined | ProjectDefaultArgs> = $Result.GetResult<Prisma.$ProjectPayload, S>

  type ProjectCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProjectFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProjectCountAggregateInputType | true
    }

  export interface ProjectDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Project'], meta: { name: 'Project' } }
    /**
     * Find zero or one Project that matches the filter.
     * @param {ProjectFindUniqueArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProjectFindUniqueArgs>(args: SelectSubset<T, ProjectFindUniqueArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Project that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProjectFindUniqueOrThrowArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProjectFindUniqueOrThrowArgs>(args: SelectSubset<T, ProjectFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Project that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindFirstArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProjectFindFirstArgs>(args?: SelectSubset<T, ProjectFindFirstArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Project that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindFirstOrThrowArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProjectFindFirstOrThrowArgs>(args?: SelectSubset<T, ProjectFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Projects that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Projects
     * const projects = await prisma.project.findMany()
     * 
     * // Get first 10 Projects
     * const projects = await prisma.project.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const projectWithIdOnly = await prisma.project.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProjectFindManyArgs>(args?: SelectSubset<T, ProjectFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Project.
     * @param {ProjectCreateArgs} args - Arguments to create a Project.
     * @example
     * // Create one Project
     * const Project = await prisma.project.create({
     *   data: {
     *     // ... data to create a Project
     *   }
     * })
     * 
     */
    create<T extends ProjectCreateArgs>(args: SelectSubset<T, ProjectCreateArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Projects.
     * @param {ProjectCreateManyArgs} args - Arguments to create many Projects.
     * @example
     * // Create many Projects
     * const project = await prisma.project.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProjectCreateManyArgs>(args?: SelectSubset<T, ProjectCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Projects and returns the data saved in the database.
     * @param {ProjectCreateManyAndReturnArgs} args - Arguments to create many Projects.
     * @example
     * // Create many Projects
     * const project = await prisma.project.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Projects and only return the `id`
     * const projectWithIdOnly = await prisma.project.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProjectCreateManyAndReturnArgs>(args?: SelectSubset<T, ProjectCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Project.
     * @param {ProjectDeleteArgs} args - Arguments to delete one Project.
     * @example
     * // Delete one Project
     * const Project = await prisma.project.delete({
     *   where: {
     *     // ... filter to delete one Project
     *   }
     * })
     * 
     */
    delete<T extends ProjectDeleteArgs>(args: SelectSubset<T, ProjectDeleteArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Project.
     * @param {ProjectUpdateArgs} args - Arguments to update one Project.
     * @example
     * // Update one Project
     * const project = await prisma.project.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProjectUpdateArgs>(args: SelectSubset<T, ProjectUpdateArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Projects.
     * @param {ProjectDeleteManyArgs} args - Arguments to filter Projects to delete.
     * @example
     * // Delete a few Projects
     * const { count } = await prisma.project.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProjectDeleteManyArgs>(args?: SelectSubset<T, ProjectDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Projects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Projects
     * const project = await prisma.project.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProjectUpdateManyArgs>(args: SelectSubset<T, ProjectUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Projects and returns the data updated in the database.
     * @param {ProjectUpdateManyAndReturnArgs} args - Arguments to update many Projects.
     * @example
     * // Update many Projects
     * const project = await prisma.project.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Projects and only return the `id`
     * const projectWithIdOnly = await prisma.project.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProjectUpdateManyAndReturnArgs>(args: SelectSubset<T, ProjectUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Project.
     * @param {ProjectUpsertArgs} args - Arguments to update or create a Project.
     * @example
     * // Update or create a Project
     * const project = await prisma.project.upsert({
     *   create: {
     *     // ... data to create a Project
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Project we want to update
     *   }
     * })
     */
    upsert<T extends ProjectUpsertArgs>(args: SelectSubset<T, ProjectUpsertArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Projects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectCountArgs} args - Arguments to filter Projects to count.
     * @example
     * // Count the number of Projects
     * const count = await prisma.project.count({
     *   where: {
     *     // ... the filter for the Projects we want to count
     *   }
     * })
    **/
    count<T extends ProjectCountArgs>(
      args?: Subset<T, ProjectCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProjectCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Project.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProjectAggregateArgs>(args: Subset<T, ProjectAggregateArgs>): Prisma.PrismaPromise<GetProjectAggregateType<T>>

    /**
     * Group by Project.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProjectGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProjectGroupByArgs['orderBy'] }
        : { orderBy?: ProjectGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProjectGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProjectGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Project model
   */
  readonly fields: ProjectFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Project.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProjectClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    repository<T extends Project$repositoryArgs<ExtArgs> = {}>(args?: Subset<T, Project$repositoryArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    project_members<T extends Project$project_membersArgs<ExtArgs> = {}>(args?: Subset<T, Project$project_membersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    documents<T extends Project$documentsArgs<ExtArgs> = {}>(args?: Subset<T, Project$documentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    ai_requests<T extends Project$ai_requestsArgs<ExtArgs> = {}>(args?: Subset<T, Project$ai_requestsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Project model
   */
  interface ProjectFieldRefs {
    readonly id: FieldRef<"Project", 'String'>
    readonly name: FieldRef<"Project", 'String'>
    readonly description: FieldRef<"Project", 'String'>
    readonly status: FieldRef<"Project", 'ProjectStatus'>
    readonly repository_id: FieldRef<"Project", 'String'>
    readonly settings: FieldRef<"Project", 'Json'>
    readonly ai_model: FieldRef<"Project", 'String'>
    readonly ai_budget: FieldRef<"Project", 'Decimal'>
    readonly created_at: FieldRef<"Project", 'DateTime'>
    readonly updated_at: FieldRef<"Project", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Project findUnique
   */
  export type ProjectFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project findUniqueOrThrow
   */
  export type ProjectFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project findFirst
   */
  export type ProjectFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Projects.
     */
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project findFirstOrThrow
   */
  export type ProjectFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Projects.
     */
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project findMany
   */
  export type ProjectFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Projects to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project create
   */
  export type ProjectCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The data needed to create a Project.
     */
    data: XOR<ProjectCreateInput, ProjectUncheckedCreateInput>
  }

  /**
   * Project createMany
   */
  export type ProjectCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Projects.
     */
    data: ProjectCreateManyInput | ProjectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Project createManyAndReturn
   */
  export type ProjectCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * The data used to create many Projects.
     */
    data: ProjectCreateManyInput | ProjectCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Project update
   */
  export type ProjectUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The data needed to update a Project.
     */
    data: XOR<ProjectUpdateInput, ProjectUncheckedUpdateInput>
    /**
     * Choose, which Project to update.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project updateMany
   */
  export type ProjectUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Projects.
     */
    data: XOR<ProjectUpdateManyMutationInput, ProjectUncheckedUpdateManyInput>
    /**
     * Filter which Projects to update
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to update.
     */
    limit?: number
  }

  /**
   * Project updateManyAndReturn
   */
  export type ProjectUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * The data used to update Projects.
     */
    data: XOR<ProjectUpdateManyMutationInput, ProjectUncheckedUpdateManyInput>
    /**
     * Filter which Projects to update
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Project upsert
   */
  export type ProjectUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The filter to search for the Project to update in case it exists.
     */
    where: ProjectWhereUniqueInput
    /**
     * In case the Project found by the `where` argument doesn't exist, create a new Project with this data.
     */
    create: XOR<ProjectCreateInput, ProjectUncheckedCreateInput>
    /**
     * In case the Project was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProjectUpdateInput, ProjectUncheckedUpdateInput>
  }

  /**
   * Project delete
   */
  export type ProjectDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter which Project to delete.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project deleteMany
   */
  export type ProjectDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Projects to delete
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to delete.
     */
    limit?: number
  }

  /**
   * Project.repository
   */
  export type Project$repositoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    where?: RepositoryWhereInput
  }

  /**
   * Project.project_members
   */
  export type Project$project_membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    cursor?: ProjectMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * Project.documents
   */
  export type Project$documentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    where?: DocumentWhereInput
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    cursor?: DocumentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentScalarFieldEnum | DocumentScalarFieldEnum[]
  }

  /**
   * Project.ai_requests
   */
  export type Project$ai_requestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    where?: AiRequestWhereInput
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    cursor?: AiRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiRequestScalarFieldEnum | AiRequestScalarFieldEnum[]
  }

  /**
   * Project without action
   */
  export type ProjectDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
  }


  /**
   * Model ProjectMember
   */

  export type AggregateProjectMember = {
    _count: ProjectMemberCountAggregateOutputType | null
    _min: ProjectMemberMinAggregateOutputType | null
    _max: ProjectMemberMaxAggregateOutputType | null
  }

  export type ProjectMemberMinAggregateOutputType = {
    id: string | null
    project_id: string | null
    user_id: string | null
    role: $Enums.MemberRole | null
    joined_at: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ProjectMemberMaxAggregateOutputType = {
    id: string | null
    project_id: string | null
    user_id: string | null
    role: $Enums.MemberRole | null
    joined_at: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type ProjectMemberCountAggregateOutputType = {
    id: number
    project_id: number
    user_id: number
    role: number
    joined_at: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type ProjectMemberMinAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    role?: true
    joined_at?: true
    created_at?: true
    updated_at?: true
  }

  export type ProjectMemberMaxAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    role?: true
    joined_at?: true
    created_at?: true
    updated_at?: true
  }

  export type ProjectMemberCountAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    role?: true
    joined_at?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type ProjectMemberAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectMember to aggregate.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProjectMembers
    **/
    _count?: true | ProjectMemberCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProjectMemberMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProjectMemberMaxAggregateInputType
  }

  export type GetProjectMemberAggregateType<T extends ProjectMemberAggregateArgs> = {
        [P in keyof T & keyof AggregateProjectMember]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProjectMember[P]>
      : GetScalarType<T[P], AggregateProjectMember[P]>
  }




  export type ProjectMemberGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithAggregationInput | ProjectMemberOrderByWithAggregationInput[]
    by: ProjectMemberScalarFieldEnum[] | ProjectMemberScalarFieldEnum
    having?: ProjectMemberScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProjectMemberCountAggregateInputType | true
    _min?: ProjectMemberMinAggregateInputType
    _max?: ProjectMemberMaxAggregateInputType
  }

  export type ProjectMemberGroupByOutputType = {
    id: string
    project_id: string
    user_id: string
    role: $Enums.MemberRole
    joined_at: Date
    created_at: Date
    updated_at: Date
    _count: ProjectMemberCountAggregateOutputType | null
    _min: ProjectMemberMinAggregateOutputType | null
    _max: ProjectMemberMaxAggregateOutputType | null
  }

  type GetProjectMemberGroupByPayload<T extends ProjectMemberGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProjectMemberGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProjectMemberGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProjectMemberGroupByOutputType[P]>
            : GetScalarType<T[P], ProjectMemberGroupByOutputType[P]>
        }
      >
    >


  export type ProjectMemberSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    role?: boolean
    joined_at?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    role?: boolean
    joined_at?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    role?: boolean
    joined_at?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectScalar = {
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    role?: boolean
    joined_at?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type ProjectMemberOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "project_id" | "user_id" | "role" | "joined_at" | "created_at" | "updated_at", ExtArgs["result"]["projectMember"]>
  export type ProjectMemberInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ProjectMemberIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ProjectMemberIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ProjectMemberPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProjectMember"
    objects: {
      project: Prisma.$ProjectPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      project_id: string
      user_id: string
      role: $Enums.MemberRole
      joined_at: Date
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["projectMember"]>
    composites: {}
  }

  type ProjectMemberGetPayload<S extends boolean | null | undefined | ProjectMemberDefaultArgs> = $Result.GetResult<Prisma.$ProjectMemberPayload, S>

  type ProjectMemberCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProjectMemberFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProjectMemberCountAggregateInputType | true
    }

  export interface ProjectMemberDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProjectMember'], meta: { name: 'ProjectMember' } }
    /**
     * Find zero or one ProjectMember that matches the filter.
     * @param {ProjectMemberFindUniqueArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProjectMemberFindUniqueArgs>(args: SelectSubset<T, ProjectMemberFindUniqueArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProjectMember that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProjectMemberFindUniqueOrThrowArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProjectMemberFindUniqueOrThrowArgs>(args: SelectSubset<T, ProjectMemberFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectMember that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindFirstArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProjectMemberFindFirstArgs>(args?: SelectSubset<T, ProjectMemberFindFirstArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectMember that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindFirstOrThrowArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProjectMemberFindFirstOrThrowArgs>(args?: SelectSubset<T, ProjectMemberFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProjectMembers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProjectMembers
     * const projectMembers = await prisma.projectMember.findMany()
     * 
     * // Get first 10 ProjectMembers
     * const projectMembers = await prisma.projectMember.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProjectMemberFindManyArgs>(args?: SelectSubset<T, ProjectMemberFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProjectMember.
     * @param {ProjectMemberCreateArgs} args - Arguments to create a ProjectMember.
     * @example
     * // Create one ProjectMember
     * const ProjectMember = await prisma.projectMember.create({
     *   data: {
     *     // ... data to create a ProjectMember
     *   }
     * })
     * 
     */
    create<T extends ProjectMemberCreateArgs>(args: SelectSubset<T, ProjectMemberCreateArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProjectMembers.
     * @param {ProjectMemberCreateManyArgs} args - Arguments to create many ProjectMembers.
     * @example
     * // Create many ProjectMembers
     * const projectMember = await prisma.projectMember.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProjectMemberCreateManyArgs>(args?: SelectSubset<T, ProjectMemberCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProjectMembers and returns the data saved in the database.
     * @param {ProjectMemberCreateManyAndReturnArgs} args - Arguments to create many ProjectMembers.
     * @example
     * // Create many ProjectMembers
     * const projectMember = await prisma.projectMember.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProjectMembers and only return the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProjectMemberCreateManyAndReturnArgs>(args?: SelectSubset<T, ProjectMemberCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProjectMember.
     * @param {ProjectMemberDeleteArgs} args - Arguments to delete one ProjectMember.
     * @example
     * // Delete one ProjectMember
     * const ProjectMember = await prisma.projectMember.delete({
     *   where: {
     *     // ... filter to delete one ProjectMember
     *   }
     * })
     * 
     */
    delete<T extends ProjectMemberDeleteArgs>(args: SelectSubset<T, ProjectMemberDeleteArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProjectMember.
     * @param {ProjectMemberUpdateArgs} args - Arguments to update one ProjectMember.
     * @example
     * // Update one ProjectMember
     * const projectMember = await prisma.projectMember.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProjectMemberUpdateArgs>(args: SelectSubset<T, ProjectMemberUpdateArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProjectMembers.
     * @param {ProjectMemberDeleteManyArgs} args - Arguments to filter ProjectMembers to delete.
     * @example
     * // Delete a few ProjectMembers
     * const { count } = await prisma.projectMember.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProjectMemberDeleteManyArgs>(args?: SelectSubset<T, ProjectMemberDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProjectMembers
     * const projectMember = await prisma.projectMember.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProjectMemberUpdateManyArgs>(args: SelectSubset<T, ProjectMemberUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectMembers and returns the data updated in the database.
     * @param {ProjectMemberUpdateManyAndReturnArgs} args - Arguments to update many ProjectMembers.
     * @example
     * // Update many ProjectMembers
     * const projectMember = await prisma.projectMember.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProjectMembers and only return the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProjectMemberUpdateManyAndReturnArgs>(args: SelectSubset<T, ProjectMemberUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProjectMember.
     * @param {ProjectMemberUpsertArgs} args - Arguments to update or create a ProjectMember.
     * @example
     * // Update or create a ProjectMember
     * const projectMember = await prisma.projectMember.upsert({
     *   create: {
     *     // ... data to create a ProjectMember
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProjectMember we want to update
     *   }
     * })
     */
    upsert<T extends ProjectMemberUpsertArgs>(args: SelectSubset<T, ProjectMemberUpsertArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProjectMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberCountArgs} args - Arguments to filter ProjectMembers to count.
     * @example
     * // Count the number of ProjectMembers
     * const count = await prisma.projectMember.count({
     *   where: {
     *     // ... the filter for the ProjectMembers we want to count
     *   }
     * })
    **/
    count<T extends ProjectMemberCountArgs>(
      args?: Subset<T, ProjectMemberCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProjectMemberCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProjectMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProjectMemberAggregateArgs>(args: Subset<T, ProjectMemberAggregateArgs>): Prisma.PrismaPromise<GetProjectMemberAggregateType<T>>

    /**
     * Group by ProjectMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProjectMemberGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProjectMemberGroupByArgs['orderBy'] }
        : { orderBy?: ProjectMemberGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProjectMemberGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProjectMemberGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProjectMember model
   */
  readonly fields: ProjectMemberFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProjectMember.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProjectMemberClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    project<T extends ProjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProjectDefaultArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProjectMember model
   */
  interface ProjectMemberFieldRefs {
    readonly id: FieldRef<"ProjectMember", 'String'>
    readonly project_id: FieldRef<"ProjectMember", 'String'>
    readonly user_id: FieldRef<"ProjectMember", 'String'>
    readonly role: FieldRef<"ProjectMember", 'MemberRole'>
    readonly joined_at: FieldRef<"ProjectMember", 'DateTime'>
    readonly created_at: FieldRef<"ProjectMember", 'DateTime'>
    readonly updated_at: FieldRef<"ProjectMember", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProjectMember findUnique
   */
  export type ProjectMemberFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember findUniqueOrThrow
   */
  export type ProjectMemberFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember findFirst
   */
  export type ProjectMemberFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectMembers.
     */
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember findFirstOrThrow
   */
  export type ProjectMemberFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectMembers.
     */
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember findMany
   */
  export type ProjectMemberFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMembers to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember create
   */
  export type ProjectMemberCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The data needed to create a ProjectMember.
     */
    data: XOR<ProjectMemberCreateInput, ProjectMemberUncheckedCreateInput>
  }

  /**
   * ProjectMember createMany
   */
  export type ProjectMemberCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProjectMembers.
     */
    data: ProjectMemberCreateManyInput | ProjectMemberCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProjectMember createManyAndReturn
   */
  export type ProjectMemberCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * The data used to create many ProjectMembers.
     */
    data: ProjectMemberCreateManyInput | ProjectMemberCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProjectMember update
   */
  export type ProjectMemberUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The data needed to update a ProjectMember.
     */
    data: XOR<ProjectMemberUpdateInput, ProjectMemberUncheckedUpdateInput>
    /**
     * Choose, which ProjectMember to update.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember updateMany
   */
  export type ProjectMemberUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProjectMembers.
     */
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyInput>
    /**
     * Filter which ProjectMembers to update
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to update.
     */
    limit?: number
  }

  /**
   * ProjectMember updateManyAndReturn
   */
  export type ProjectMemberUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * The data used to update ProjectMembers.
     */
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyInput>
    /**
     * Filter which ProjectMembers to update
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProjectMember upsert
   */
  export type ProjectMemberUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The filter to search for the ProjectMember to update in case it exists.
     */
    where: ProjectMemberWhereUniqueInput
    /**
     * In case the ProjectMember found by the `where` argument doesn't exist, create a new ProjectMember with this data.
     */
    create: XOR<ProjectMemberCreateInput, ProjectMemberUncheckedCreateInput>
    /**
     * In case the ProjectMember was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProjectMemberUpdateInput, ProjectMemberUncheckedUpdateInput>
  }

  /**
   * ProjectMember delete
   */
  export type ProjectMemberDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter which ProjectMember to delete.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember deleteMany
   */
  export type ProjectMemberDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectMembers to delete
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to delete.
     */
    limit?: number
  }

  /**
   * ProjectMember without action
   */
  export type ProjectMemberDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
  }


  /**
   * Model Repository
   */

  export type AggregateRepository = {
    _count: RepositoryCountAggregateOutputType | null
    _avg: RepositoryAvgAggregateOutputType | null
    _sum: RepositorySumAggregateOutputType | null
    _min: RepositoryMinAggregateOutputType | null
    _max: RepositoryMaxAggregateOutputType | null
  }

  export type RepositoryAvgAggregateOutputType = {
    github_id: number | null
    webhook_id: number | null
  }

  export type RepositorySumAggregateOutputType = {
    github_id: number | null
    webhook_id: number | null
  }

  export type RepositoryMinAggregateOutputType = {
    id: string | null
    github_id: number | null
    full_name: string | null
    name: string | null
    owner: string | null
    description: string | null
    clone_url: string | null
    ssh_url: string | null
    default_branch: string | null
    is_private: boolean | null
    webhook_id: number | null
    webhook_secret: string | null
    last_sync_at: Date | null
    sync_status: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type RepositoryMaxAggregateOutputType = {
    id: string | null
    github_id: number | null
    full_name: string | null
    name: string | null
    owner: string | null
    description: string | null
    clone_url: string | null
    ssh_url: string | null
    default_branch: string | null
    is_private: boolean | null
    webhook_id: number | null
    webhook_secret: string | null
    last_sync_at: Date | null
    sync_status: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type RepositoryCountAggregateOutputType = {
    id: number
    github_id: number
    full_name: number
    name: number
    owner: number
    description: number
    clone_url: number
    ssh_url: number
    default_branch: number
    is_private: number
    webhook_id: number
    webhook_secret: number
    last_sync_at: number
    sync_status: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type RepositoryAvgAggregateInputType = {
    github_id?: true
    webhook_id?: true
  }

  export type RepositorySumAggregateInputType = {
    github_id?: true
    webhook_id?: true
  }

  export type RepositoryMinAggregateInputType = {
    id?: true
    github_id?: true
    full_name?: true
    name?: true
    owner?: true
    description?: true
    clone_url?: true
    ssh_url?: true
    default_branch?: true
    is_private?: true
    webhook_id?: true
    webhook_secret?: true
    last_sync_at?: true
    sync_status?: true
    created_at?: true
    updated_at?: true
  }

  export type RepositoryMaxAggregateInputType = {
    id?: true
    github_id?: true
    full_name?: true
    name?: true
    owner?: true
    description?: true
    clone_url?: true
    ssh_url?: true
    default_branch?: true
    is_private?: true
    webhook_id?: true
    webhook_secret?: true
    last_sync_at?: true
    sync_status?: true
    created_at?: true
    updated_at?: true
  }

  export type RepositoryCountAggregateInputType = {
    id?: true
    github_id?: true
    full_name?: true
    name?: true
    owner?: true
    description?: true
    clone_url?: true
    ssh_url?: true
    default_branch?: true
    is_private?: true
    webhook_id?: true
    webhook_secret?: true
    last_sync_at?: true
    sync_status?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type RepositoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Repository to aggregate.
     */
    where?: RepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Repositories to fetch.
     */
    orderBy?: RepositoryOrderByWithRelationInput | RepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Repositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Repositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Repositories
    **/
    _count?: true | RepositoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RepositoryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RepositorySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RepositoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RepositoryMaxAggregateInputType
  }

  export type GetRepositoryAggregateType<T extends RepositoryAggregateArgs> = {
        [P in keyof T & keyof AggregateRepository]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRepository[P]>
      : GetScalarType<T[P], AggregateRepository[P]>
  }




  export type RepositoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RepositoryWhereInput
    orderBy?: RepositoryOrderByWithAggregationInput | RepositoryOrderByWithAggregationInput[]
    by: RepositoryScalarFieldEnum[] | RepositoryScalarFieldEnum
    having?: RepositoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RepositoryCountAggregateInputType | true
    _avg?: RepositoryAvgAggregateInputType
    _sum?: RepositorySumAggregateInputType
    _min?: RepositoryMinAggregateInputType
    _max?: RepositoryMaxAggregateInputType
  }

  export type RepositoryGroupByOutputType = {
    id: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description: string | null
    clone_url: string
    ssh_url: string
    default_branch: string
    is_private: boolean
    webhook_id: number | null
    webhook_secret: string | null
    last_sync_at: Date | null
    sync_status: string | null
    created_at: Date
    updated_at: Date
    _count: RepositoryCountAggregateOutputType | null
    _avg: RepositoryAvgAggregateOutputType | null
    _sum: RepositorySumAggregateOutputType | null
    _min: RepositoryMinAggregateOutputType | null
    _max: RepositoryMaxAggregateOutputType | null
  }

  type GetRepositoryGroupByPayload<T extends RepositoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RepositoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RepositoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RepositoryGroupByOutputType[P]>
            : GetScalarType<T[P], RepositoryGroupByOutputType[P]>
        }
      >
    >


  export type RepositorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    github_id?: boolean
    full_name?: boolean
    name?: boolean
    owner?: boolean
    description?: boolean
    clone_url?: boolean
    ssh_url?: boolean
    default_branch?: boolean
    is_private?: boolean
    webhook_id?: boolean
    webhook_secret?: boolean
    last_sync_at?: boolean
    sync_status?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | Repository$projectArgs<ExtArgs>
  }, ExtArgs["result"]["repository"]>

  export type RepositorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    github_id?: boolean
    full_name?: boolean
    name?: boolean
    owner?: boolean
    description?: boolean
    clone_url?: boolean
    ssh_url?: boolean
    default_branch?: boolean
    is_private?: boolean
    webhook_id?: boolean
    webhook_secret?: boolean
    last_sync_at?: boolean
    sync_status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["repository"]>

  export type RepositorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    github_id?: boolean
    full_name?: boolean
    name?: boolean
    owner?: boolean
    description?: boolean
    clone_url?: boolean
    ssh_url?: boolean
    default_branch?: boolean
    is_private?: boolean
    webhook_id?: boolean
    webhook_secret?: boolean
    last_sync_at?: boolean
    sync_status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["repository"]>

  export type RepositorySelectScalar = {
    id?: boolean
    github_id?: boolean
    full_name?: boolean
    name?: boolean
    owner?: boolean
    description?: boolean
    clone_url?: boolean
    ssh_url?: boolean
    default_branch?: boolean
    is_private?: boolean
    webhook_id?: boolean
    webhook_secret?: boolean
    last_sync_at?: boolean
    sync_status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type RepositoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "github_id" | "full_name" | "name" | "owner" | "description" | "clone_url" | "ssh_url" | "default_branch" | "is_private" | "webhook_id" | "webhook_secret" | "last_sync_at" | "sync_status" | "created_at" | "updated_at", ExtArgs["result"]["repository"]>
  export type RepositoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | Repository$projectArgs<ExtArgs>
  }
  export type RepositoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type RepositoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $RepositoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Repository"
    objects: {
      project: Prisma.$ProjectPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      github_id: number
      full_name: string
      name: string
      owner: string
      description: string | null
      clone_url: string
      ssh_url: string
      default_branch: string
      is_private: boolean
      webhook_id: number | null
      webhook_secret: string | null
      last_sync_at: Date | null
      sync_status: string | null
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["repository"]>
    composites: {}
  }

  type RepositoryGetPayload<S extends boolean | null | undefined | RepositoryDefaultArgs> = $Result.GetResult<Prisma.$RepositoryPayload, S>

  type RepositoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RepositoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RepositoryCountAggregateInputType | true
    }

  export interface RepositoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Repository'], meta: { name: 'Repository' } }
    /**
     * Find zero or one Repository that matches the filter.
     * @param {RepositoryFindUniqueArgs} args - Arguments to find a Repository
     * @example
     * // Get one Repository
     * const repository = await prisma.repository.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RepositoryFindUniqueArgs>(args: SelectSubset<T, RepositoryFindUniqueArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Repository that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RepositoryFindUniqueOrThrowArgs} args - Arguments to find a Repository
     * @example
     * // Get one Repository
     * const repository = await prisma.repository.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RepositoryFindUniqueOrThrowArgs>(args: SelectSubset<T, RepositoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Repository that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryFindFirstArgs} args - Arguments to find a Repository
     * @example
     * // Get one Repository
     * const repository = await prisma.repository.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RepositoryFindFirstArgs>(args?: SelectSubset<T, RepositoryFindFirstArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Repository that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryFindFirstOrThrowArgs} args - Arguments to find a Repository
     * @example
     * // Get one Repository
     * const repository = await prisma.repository.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RepositoryFindFirstOrThrowArgs>(args?: SelectSubset<T, RepositoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Repositories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Repositories
     * const repositories = await prisma.repository.findMany()
     * 
     * // Get first 10 Repositories
     * const repositories = await prisma.repository.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const repositoryWithIdOnly = await prisma.repository.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RepositoryFindManyArgs>(args?: SelectSubset<T, RepositoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Repository.
     * @param {RepositoryCreateArgs} args - Arguments to create a Repository.
     * @example
     * // Create one Repository
     * const Repository = await prisma.repository.create({
     *   data: {
     *     // ... data to create a Repository
     *   }
     * })
     * 
     */
    create<T extends RepositoryCreateArgs>(args: SelectSubset<T, RepositoryCreateArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Repositories.
     * @param {RepositoryCreateManyArgs} args - Arguments to create many Repositories.
     * @example
     * // Create many Repositories
     * const repository = await prisma.repository.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RepositoryCreateManyArgs>(args?: SelectSubset<T, RepositoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Repositories and returns the data saved in the database.
     * @param {RepositoryCreateManyAndReturnArgs} args - Arguments to create many Repositories.
     * @example
     * // Create many Repositories
     * const repository = await prisma.repository.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Repositories and only return the `id`
     * const repositoryWithIdOnly = await prisma.repository.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RepositoryCreateManyAndReturnArgs>(args?: SelectSubset<T, RepositoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Repository.
     * @param {RepositoryDeleteArgs} args - Arguments to delete one Repository.
     * @example
     * // Delete one Repository
     * const Repository = await prisma.repository.delete({
     *   where: {
     *     // ... filter to delete one Repository
     *   }
     * })
     * 
     */
    delete<T extends RepositoryDeleteArgs>(args: SelectSubset<T, RepositoryDeleteArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Repository.
     * @param {RepositoryUpdateArgs} args - Arguments to update one Repository.
     * @example
     * // Update one Repository
     * const repository = await prisma.repository.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RepositoryUpdateArgs>(args: SelectSubset<T, RepositoryUpdateArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Repositories.
     * @param {RepositoryDeleteManyArgs} args - Arguments to filter Repositories to delete.
     * @example
     * // Delete a few Repositories
     * const { count } = await prisma.repository.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RepositoryDeleteManyArgs>(args?: SelectSubset<T, RepositoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Repositories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Repositories
     * const repository = await prisma.repository.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RepositoryUpdateManyArgs>(args: SelectSubset<T, RepositoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Repositories and returns the data updated in the database.
     * @param {RepositoryUpdateManyAndReturnArgs} args - Arguments to update many Repositories.
     * @example
     * // Update many Repositories
     * const repository = await prisma.repository.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Repositories and only return the `id`
     * const repositoryWithIdOnly = await prisma.repository.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RepositoryUpdateManyAndReturnArgs>(args: SelectSubset<T, RepositoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Repository.
     * @param {RepositoryUpsertArgs} args - Arguments to update or create a Repository.
     * @example
     * // Update or create a Repository
     * const repository = await prisma.repository.upsert({
     *   create: {
     *     // ... data to create a Repository
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Repository we want to update
     *   }
     * })
     */
    upsert<T extends RepositoryUpsertArgs>(args: SelectSubset<T, RepositoryUpsertArgs<ExtArgs>>): Prisma__RepositoryClient<$Result.GetResult<Prisma.$RepositoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Repositories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryCountArgs} args - Arguments to filter Repositories to count.
     * @example
     * // Count the number of Repositories
     * const count = await prisma.repository.count({
     *   where: {
     *     // ... the filter for the Repositories we want to count
     *   }
     * })
    **/
    count<T extends RepositoryCountArgs>(
      args?: Subset<T, RepositoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RepositoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Repository.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RepositoryAggregateArgs>(args: Subset<T, RepositoryAggregateArgs>): Prisma.PrismaPromise<GetRepositoryAggregateType<T>>

    /**
     * Group by Repository.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RepositoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RepositoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RepositoryGroupByArgs['orderBy'] }
        : { orderBy?: RepositoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RepositoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRepositoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Repository model
   */
  readonly fields: RepositoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Repository.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RepositoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    project<T extends Repository$projectArgs<ExtArgs> = {}>(args?: Subset<T, Repository$projectArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Repository model
   */
  interface RepositoryFieldRefs {
    readonly id: FieldRef<"Repository", 'String'>
    readonly github_id: FieldRef<"Repository", 'Int'>
    readonly full_name: FieldRef<"Repository", 'String'>
    readonly name: FieldRef<"Repository", 'String'>
    readonly owner: FieldRef<"Repository", 'String'>
    readonly description: FieldRef<"Repository", 'String'>
    readonly clone_url: FieldRef<"Repository", 'String'>
    readonly ssh_url: FieldRef<"Repository", 'String'>
    readonly default_branch: FieldRef<"Repository", 'String'>
    readonly is_private: FieldRef<"Repository", 'Boolean'>
    readonly webhook_id: FieldRef<"Repository", 'Int'>
    readonly webhook_secret: FieldRef<"Repository", 'String'>
    readonly last_sync_at: FieldRef<"Repository", 'DateTime'>
    readonly sync_status: FieldRef<"Repository", 'String'>
    readonly created_at: FieldRef<"Repository", 'DateTime'>
    readonly updated_at: FieldRef<"Repository", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Repository findUnique
   */
  export type RepositoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter, which Repository to fetch.
     */
    where: RepositoryWhereUniqueInput
  }

  /**
   * Repository findUniqueOrThrow
   */
  export type RepositoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter, which Repository to fetch.
     */
    where: RepositoryWhereUniqueInput
  }

  /**
   * Repository findFirst
   */
  export type RepositoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter, which Repository to fetch.
     */
    where?: RepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Repositories to fetch.
     */
    orderBy?: RepositoryOrderByWithRelationInput | RepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Repositories.
     */
    cursor?: RepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Repositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Repositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Repositories.
     */
    distinct?: RepositoryScalarFieldEnum | RepositoryScalarFieldEnum[]
  }

  /**
   * Repository findFirstOrThrow
   */
  export type RepositoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter, which Repository to fetch.
     */
    where?: RepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Repositories to fetch.
     */
    orderBy?: RepositoryOrderByWithRelationInput | RepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Repositories.
     */
    cursor?: RepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Repositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Repositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Repositories.
     */
    distinct?: RepositoryScalarFieldEnum | RepositoryScalarFieldEnum[]
  }

  /**
   * Repository findMany
   */
  export type RepositoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter, which Repositories to fetch.
     */
    where?: RepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Repositories to fetch.
     */
    orderBy?: RepositoryOrderByWithRelationInput | RepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Repositories.
     */
    cursor?: RepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Repositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Repositories.
     */
    skip?: number
    distinct?: RepositoryScalarFieldEnum | RepositoryScalarFieldEnum[]
  }

  /**
   * Repository create
   */
  export type RepositoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * The data needed to create a Repository.
     */
    data: XOR<RepositoryCreateInput, RepositoryUncheckedCreateInput>
  }

  /**
   * Repository createMany
   */
  export type RepositoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Repositories.
     */
    data: RepositoryCreateManyInput | RepositoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Repository createManyAndReturn
   */
  export type RepositoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * The data used to create many Repositories.
     */
    data: RepositoryCreateManyInput | RepositoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Repository update
   */
  export type RepositoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * The data needed to update a Repository.
     */
    data: XOR<RepositoryUpdateInput, RepositoryUncheckedUpdateInput>
    /**
     * Choose, which Repository to update.
     */
    where: RepositoryWhereUniqueInput
  }

  /**
   * Repository updateMany
   */
  export type RepositoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Repositories.
     */
    data: XOR<RepositoryUpdateManyMutationInput, RepositoryUncheckedUpdateManyInput>
    /**
     * Filter which Repositories to update
     */
    where?: RepositoryWhereInput
    /**
     * Limit how many Repositories to update.
     */
    limit?: number
  }

  /**
   * Repository updateManyAndReturn
   */
  export type RepositoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * The data used to update Repositories.
     */
    data: XOR<RepositoryUpdateManyMutationInput, RepositoryUncheckedUpdateManyInput>
    /**
     * Filter which Repositories to update
     */
    where?: RepositoryWhereInput
    /**
     * Limit how many Repositories to update.
     */
    limit?: number
  }

  /**
   * Repository upsert
   */
  export type RepositoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * The filter to search for the Repository to update in case it exists.
     */
    where: RepositoryWhereUniqueInput
    /**
     * In case the Repository found by the `where` argument doesn't exist, create a new Repository with this data.
     */
    create: XOR<RepositoryCreateInput, RepositoryUncheckedCreateInput>
    /**
     * In case the Repository was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RepositoryUpdateInput, RepositoryUncheckedUpdateInput>
  }

  /**
   * Repository delete
   */
  export type RepositoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
    /**
     * Filter which Repository to delete.
     */
    where: RepositoryWhereUniqueInput
  }

  /**
   * Repository deleteMany
   */
  export type RepositoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Repositories to delete
     */
    where?: RepositoryWhereInput
    /**
     * Limit how many Repositories to delete.
     */
    limit?: number
  }

  /**
   * Repository.project
   */
  export type Repository$projectArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    where?: ProjectWhereInput
  }

  /**
   * Repository without action
   */
  export type RepositoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Repository
     */
    select?: RepositorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Repository
     */
    omit?: RepositoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RepositoryInclude<ExtArgs> | null
  }


  /**
   * Model Document
   */

  export type AggregateDocument = {
    _count: DocumentCountAggregateOutputType | null
    _min: DocumentMinAggregateOutputType | null
    _max: DocumentMaxAggregateOutputType | null
  }

  export type DocumentMinAggregateOutputType = {
    id: string | null
    project_id: string | null
    title: string | null
    description: string | null
    type: $Enums.DocumentType | null
    status: $Enums.DocumentStatus | null
    file_path: string | null
    created_by: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type DocumentMaxAggregateOutputType = {
    id: string | null
    project_id: string | null
    title: string | null
    description: string | null
    type: $Enums.DocumentType | null
    status: $Enums.DocumentStatus | null
    file_path: string | null
    created_by: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type DocumentCountAggregateOutputType = {
    id: number
    project_id: number
    title: number
    description: number
    type: number
    status: number
    file_path: number
    metadata: number
    created_by: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type DocumentMinAggregateInputType = {
    id?: true
    project_id?: true
    title?: true
    description?: true
    type?: true
    status?: true
    file_path?: true
    created_by?: true
    created_at?: true
    updated_at?: true
  }

  export type DocumentMaxAggregateInputType = {
    id?: true
    project_id?: true
    title?: true
    description?: true
    type?: true
    status?: true
    file_path?: true
    created_by?: true
    created_at?: true
    updated_at?: true
  }

  export type DocumentCountAggregateInputType = {
    id?: true
    project_id?: true
    title?: true
    description?: true
    type?: true
    status?: true
    file_path?: true
    metadata?: true
    created_by?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type DocumentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Document to aggregate.
     */
    where?: DocumentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DocumentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Documents
    **/
    _count?: true | DocumentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DocumentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DocumentMaxAggregateInputType
  }

  export type GetDocumentAggregateType<T extends DocumentAggregateArgs> = {
        [P in keyof T & keyof AggregateDocument]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDocument[P]>
      : GetScalarType<T[P], AggregateDocument[P]>
  }




  export type DocumentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentWhereInput
    orderBy?: DocumentOrderByWithAggregationInput | DocumentOrderByWithAggregationInput[]
    by: DocumentScalarFieldEnum[] | DocumentScalarFieldEnum
    having?: DocumentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DocumentCountAggregateInputType | true
    _min?: DocumentMinAggregateInputType
    _max?: DocumentMaxAggregateInputType
  }

  export type DocumentGroupByOutputType = {
    id: string
    project_id: string
    title: string
    description: string | null
    type: $Enums.DocumentType
    status: $Enums.DocumentStatus
    file_path: string | null
    metadata: JsonValue
    created_by: string
    created_at: Date
    updated_at: Date
    _count: DocumentCountAggregateOutputType | null
    _min: DocumentMinAggregateOutputType | null
    _max: DocumentMaxAggregateOutputType | null
  }

  type GetDocumentGroupByPayload<T extends DocumentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DocumentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DocumentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DocumentGroupByOutputType[P]>
            : GetScalarType<T[P], DocumentGroupByOutputType[P]>
        }
      >
    >


  export type DocumentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    title?: boolean
    description?: boolean
    type?: boolean
    status?: boolean
    file_path?: boolean
    metadata?: boolean
    created_by?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
    versions?: boolean | Document$versionsArgs<ExtArgs>
    _count?: boolean | DocumentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["document"]>

  export type DocumentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    title?: boolean
    description?: boolean
    type?: boolean
    status?: boolean
    file_path?: boolean
    metadata?: boolean
    created_by?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["document"]>

  export type DocumentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    title?: boolean
    description?: boolean
    type?: boolean
    status?: boolean
    file_path?: boolean
    metadata?: boolean
    created_by?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["document"]>

  export type DocumentSelectScalar = {
    id?: boolean
    project_id?: boolean
    title?: boolean
    description?: boolean
    type?: boolean
    status?: boolean
    file_path?: boolean
    metadata?: boolean
    created_by?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type DocumentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "project_id" | "title" | "description" | "type" | "status" | "file_path" | "metadata" | "created_by" | "created_at" | "updated_at", ExtArgs["result"]["document"]>
  export type DocumentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
    versions?: boolean | Document$versionsArgs<ExtArgs>
    _count?: boolean | DocumentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type DocumentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type DocumentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $DocumentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Document"
    objects: {
      project: Prisma.$ProjectPayload<ExtArgs>
      creator: Prisma.$UserPayload<ExtArgs>
      versions: Prisma.$DocumentVersionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      project_id: string
      title: string
      description: string | null
      type: $Enums.DocumentType
      status: $Enums.DocumentStatus
      file_path: string | null
      metadata: Prisma.JsonValue
      created_by: string
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["document"]>
    composites: {}
  }

  type DocumentGetPayload<S extends boolean | null | undefined | DocumentDefaultArgs> = $Result.GetResult<Prisma.$DocumentPayload, S>

  type DocumentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DocumentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DocumentCountAggregateInputType | true
    }

  export interface DocumentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Document'], meta: { name: 'Document' } }
    /**
     * Find zero or one Document that matches the filter.
     * @param {DocumentFindUniqueArgs} args - Arguments to find a Document
     * @example
     * // Get one Document
     * const document = await prisma.document.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DocumentFindUniqueArgs>(args: SelectSubset<T, DocumentFindUniqueArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Document that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DocumentFindUniqueOrThrowArgs} args - Arguments to find a Document
     * @example
     * // Get one Document
     * const document = await prisma.document.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DocumentFindUniqueOrThrowArgs>(args: SelectSubset<T, DocumentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Document that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentFindFirstArgs} args - Arguments to find a Document
     * @example
     * // Get one Document
     * const document = await prisma.document.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DocumentFindFirstArgs>(args?: SelectSubset<T, DocumentFindFirstArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Document that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentFindFirstOrThrowArgs} args - Arguments to find a Document
     * @example
     * // Get one Document
     * const document = await prisma.document.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DocumentFindFirstOrThrowArgs>(args?: SelectSubset<T, DocumentFindFirstOrThrowArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Documents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Documents
     * const documents = await prisma.document.findMany()
     * 
     * // Get first 10 Documents
     * const documents = await prisma.document.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const documentWithIdOnly = await prisma.document.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DocumentFindManyArgs>(args?: SelectSubset<T, DocumentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Document.
     * @param {DocumentCreateArgs} args - Arguments to create a Document.
     * @example
     * // Create one Document
     * const Document = await prisma.document.create({
     *   data: {
     *     // ... data to create a Document
     *   }
     * })
     * 
     */
    create<T extends DocumentCreateArgs>(args: SelectSubset<T, DocumentCreateArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Documents.
     * @param {DocumentCreateManyArgs} args - Arguments to create many Documents.
     * @example
     * // Create many Documents
     * const document = await prisma.document.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DocumentCreateManyArgs>(args?: SelectSubset<T, DocumentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Documents and returns the data saved in the database.
     * @param {DocumentCreateManyAndReturnArgs} args - Arguments to create many Documents.
     * @example
     * // Create many Documents
     * const document = await prisma.document.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Documents and only return the `id`
     * const documentWithIdOnly = await prisma.document.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DocumentCreateManyAndReturnArgs>(args?: SelectSubset<T, DocumentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Document.
     * @param {DocumentDeleteArgs} args - Arguments to delete one Document.
     * @example
     * // Delete one Document
     * const Document = await prisma.document.delete({
     *   where: {
     *     // ... filter to delete one Document
     *   }
     * })
     * 
     */
    delete<T extends DocumentDeleteArgs>(args: SelectSubset<T, DocumentDeleteArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Document.
     * @param {DocumentUpdateArgs} args - Arguments to update one Document.
     * @example
     * // Update one Document
     * const document = await prisma.document.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DocumentUpdateArgs>(args: SelectSubset<T, DocumentUpdateArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Documents.
     * @param {DocumentDeleteManyArgs} args - Arguments to filter Documents to delete.
     * @example
     * // Delete a few Documents
     * const { count } = await prisma.document.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DocumentDeleteManyArgs>(args?: SelectSubset<T, DocumentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Documents
     * const document = await prisma.document.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DocumentUpdateManyArgs>(args: SelectSubset<T, DocumentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documents and returns the data updated in the database.
     * @param {DocumentUpdateManyAndReturnArgs} args - Arguments to update many Documents.
     * @example
     * // Update many Documents
     * const document = await prisma.document.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Documents and only return the `id`
     * const documentWithIdOnly = await prisma.document.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DocumentUpdateManyAndReturnArgs>(args: SelectSubset<T, DocumentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Document.
     * @param {DocumentUpsertArgs} args - Arguments to update or create a Document.
     * @example
     * // Update or create a Document
     * const document = await prisma.document.upsert({
     *   create: {
     *     // ... data to create a Document
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Document we want to update
     *   }
     * })
     */
    upsert<T extends DocumentUpsertArgs>(args: SelectSubset<T, DocumentUpsertArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentCountArgs} args - Arguments to filter Documents to count.
     * @example
     * // Count the number of Documents
     * const count = await prisma.document.count({
     *   where: {
     *     // ... the filter for the Documents we want to count
     *   }
     * })
    **/
    count<T extends DocumentCountArgs>(
      args?: Subset<T, DocumentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DocumentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Document.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DocumentAggregateArgs>(args: Subset<T, DocumentAggregateArgs>): Prisma.PrismaPromise<GetDocumentAggregateType<T>>

    /**
     * Group by Document.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DocumentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DocumentGroupByArgs['orderBy'] }
        : { orderBy?: DocumentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DocumentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDocumentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Document model
   */
  readonly fields: DocumentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Document.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DocumentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    project<T extends ProjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProjectDefaultArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    creator<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    versions<T extends Document$versionsArgs<ExtArgs> = {}>(args?: Subset<T, Document$versionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Document model
   */
  interface DocumentFieldRefs {
    readonly id: FieldRef<"Document", 'String'>
    readonly project_id: FieldRef<"Document", 'String'>
    readonly title: FieldRef<"Document", 'String'>
    readonly description: FieldRef<"Document", 'String'>
    readonly type: FieldRef<"Document", 'DocumentType'>
    readonly status: FieldRef<"Document", 'DocumentStatus'>
    readonly file_path: FieldRef<"Document", 'String'>
    readonly metadata: FieldRef<"Document", 'Json'>
    readonly created_by: FieldRef<"Document", 'String'>
    readonly created_at: FieldRef<"Document", 'DateTime'>
    readonly updated_at: FieldRef<"Document", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Document findUnique
   */
  export type DocumentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter, which Document to fetch.
     */
    where: DocumentWhereUniqueInput
  }

  /**
   * Document findUniqueOrThrow
   */
  export type DocumentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter, which Document to fetch.
     */
    where: DocumentWhereUniqueInput
  }

  /**
   * Document findFirst
   */
  export type DocumentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter, which Document to fetch.
     */
    where?: DocumentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documents.
     */
    cursor?: DocumentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documents.
     */
    distinct?: DocumentScalarFieldEnum | DocumentScalarFieldEnum[]
  }

  /**
   * Document findFirstOrThrow
   */
  export type DocumentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter, which Document to fetch.
     */
    where?: DocumentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documents.
     */
    cursor?: DocumentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documents.
     */
    distinct?: DocumentScalarFieldEnum | DocumentScalarFieldEnum[]
  }

  /**
   * Document findMany
   */
  export type DocumentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where?: DocumentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentOrderByWithRelationInput | DocumentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Documents.
     */
    cursor?: DocumentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    distinct?: DocumentScalarFieldEnum | DocumentScalarFieldEnum[]
  }

  /**
   * Document create
   */
  export type DocumentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * The data needed to create a Document.
     */
    data: XOR<DocumentCreateInput, DocumentUncheckedCreateInput>
  }

  /**
   * Document createMany
   */
  export type DocumentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Documents.
     */
    data: DocumentCreateManyInput | DocumentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Document createManyAndReturn
   */
  export type DocumentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * The data used to create many Documents.
     */
    data: DocumentCreateManyInput | DocumentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Document update
   */
  export type DocumentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * The data needed to update a Document.
     */
    data: XOR<DocumentUpdateInput, DocumentUncheckedUpdateInput>
    /**
     * Choose, which Document to update.
     */
    where: DocumentWhereUniqueInput
  }

  /**
   * Document updateMany
   */
  export type DocumentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Documents.
     */
    data: XOR<DocumentUpdateManyMutationInput, DocumentUncheckedUpdateManyInput>
    /**
     * Filter which Documents to update
     */
    where?: DocumentWhereInput
    /**
     * Limit how many Documents to update.
     */
    limit?: number
  }

  /**
   * Document updateManyAndReturn
   */
  export type DocumentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * The data used to update Documents.
     */
    data: XOR<DocumentUpdateManyMutationInput, DocumentUncheckedUpdateManyInput>
    /**
     * Filter which Documents to update
     */
    where?: DocumentWhereInput
    /**
     * Limit how many Documents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Document upsert
   */
  export type DocumentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * The filter to search for the Document to update in case it exists.
     */
    where: DocumentWhereUniqueInput
    /**
     * In case the Document found by the `where` argument doesn't exist, create a new Document with this data.
     */
    create: XOR<DocumentCreateInput, DocumentUncheckedCreateInput>
    /**
     * In case the Document was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DocumentUpdateInput, DocumentUncheckedUpdateInput>
  }

  /**
   * Document delete
   */
  export type DocumentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
    /**
     * Filter which Document to delete.
     */
    where: DocumentWhereUniqueInput
  }

  /**
   * Document deleteMany
   */
  export type DocumentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Documents to delete
     */
    where?: DocumentWhereInput
    /**
     * Limit how many Documents to delete.
     */
    limit?: number
  }

  /**
   * Document.versions
   */
  export type Document$versionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    where?: DocumentVersionWhereInput
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    cursor?: DocumentVersionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentVersionScalarFieldEnum | DocumentVersionScalarFieldEnum[]
  }

  /**
   * Document without action
   */
  export type DocumentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Document
     */
    select?: DocumentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Document
     */
    omit?: DocumentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentInclude<ExtArgs> | null
  }


  /**
   * Model DocumentVersion
   */

  export type AggregateDocumentVersion = {
    _count: DocumentVersionCountAggregateOutputType | null
    _avg: DocumentVersionAvgAggregateOutputType | null
    _sum: DocumentVersionSumAggregateOutputType | null
    _min: DocumentVersionMinAggregateOutputType | null
    _max: DocumentVersionMaxAggregateOutputType | null
  }

  export type DocumentVersionAvgAggregateOutputType = {
    version: number | null
  }

  export type DocumentVersionSumAggregateOutputType = {
    version: number | null
  }

  export type DocumentVersionMinAggregateOutputType = {
    id: string | null
    document_id: string | null
    version: number | null
    content: string | null
    diff_from_previous: string | null
    commit_hash: string | null
    created_by: string | null
    created_at: Date | null
  }

  export type DocumentVersionMaxAggregateOutputType = {
    id: string | null
    document_id: string | null
    version: number | null
    content: string | null
    diff_from_previous: string | null
    commit_hash: string | null
    created_by: string | null
    created_at: Date | null
  }

  export type DocumentVersionCountAggregateOutputType = {
    id: number
    document_id: number
    version: number
    content: number
    diff_from_previous: number
    commit_hash: number
    created_by: number
    created_at: number
    _all: number
  }


  export type DocumentVersionAvgAggregateInputType = {
    version?: true
  }

  export type DocumentVersionSumAggregateInputType = {
    version?: true
  }

  export type DocumentVersionMinAggregateInputType = {
    id?: true
    document_id?: true
    version?: true
    content?: true
    diff_from_previous?: true
    commit_hash?: true
    created_by?: true
    created_at?: true
  }

  export type DocumentVersionMaxAggregateInputType = {
    id?: true
    document_id?: true
    version?: true
    content?: true
    diff_from_previous?: true
    commit_hash?: true
    created_by?: true
    created_at?: true
  }

  export type DocumentVersionCountAggregateInputType = {
    id?: true
    document_id?: true
    version?: true
    content?: true
    diff_from_previous?: true
    commit_hash?: true
    created_by?: true
    created_at?: true
    _all?: true
  }

  export type DocumentVersionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DocumentVersion to aggregate.
     */
    where?: DocumentVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DocumentVersions to fetch.
     */
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DocumentVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DocumentVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DocumentVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DocumentVersions
    **/
    _count?: true | DocumentVersionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DocumentVersionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DocumentVersionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DocumentVersionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DocumentVersionMaxAggregateInputType
  }

  export type GetDocumentVersionAggregateType<T extends DocumentVersionAggregateArgs> = {
        [P in keyof T & keyof AggregateDocumentVersion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDocumentVersion[P]>
      : GetScalarType<T[P], AggregateDocumentVersion[P]>
  }




  export type DocumentVersionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentVersionWhereInput
    orderBy?: DocumentVersionOrderByWithAggregationInput | DocumentVersionOrderByWithAggregationInput[]
    by: DocumentVersionScalarFieldEnum[] | DocumentVersionScalarFieldEnum
    having?: DocumentVersionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DocumentVersionCountAggregateInputType | true
    _avg?: DocumentVersionAvgAggregateInputType
    _sum?: DocumentVersionSumAggregateInputType
    _min?: DocumentVersionMinAggregateInputType
    _max?: DocumentVersionMaxAggregateInputType
  }

  export type DocumentVersionGroupByOutputType = {
    id: string
    document_id: string
    version: number
    content: string
    diff_from_previous: string | null
    commit_hash: string | null
    created_by: string
    created_at: Date
    _count: DocumentVersionCountAggregateOutputType | null
    _avg: DocumentVersionAvgAggregateOutputType | null
    _sum: DocumentVersionSumAggregateOutputType | null
    _min: DocumentVersionMinAggregateOutputType | null
    _max: DocumentVersionMaxAggregateOutputType | null
  }

  type GetDocumentVersionGroupByPayload<T extends DocumentVersionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DocumentVersionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DocumentVersionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DocumentVersionGroupByOutputType[P]>
            : GetScalarType<T[P], DocumentVersionGroupByOutputType[P]>
        }
      >
    >


  export type DocumentVersionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    document_id?: boolean
    version?: boolean
    content?: boolean
    diff_from_previous?: boolean
    commit_hash?: boolean
    created_by?: boolean
    created_at?: boolean
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["documentVersion"]>

  export type DocumentVersionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    document_id?: boolean
    version?: boolean
    content?: boolean
    diff_from_previous?: boolean
    commit_hash?: boolean
    created_by?: boolean
    created_at?: boolean
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["documentVersion"]>

  export type DocumentVersionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    document_id?: boolean
    version?: boolean
    content?: boolean
    diff_from_previous?: boolean
    commit_hash?: boolean
    created_by?: boolean
    created_at?: boolean
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["documentVersion"]>

  export type DocumentVersionSelectScalar = {
    id?: boolean
    document_id?: boolean
    version?: boolean
    content?: boolean
    diff_from_previous?: boolean
    commit_hash?: boolean
    created_by?: boolean
    created_at?: boolean
  }

  export type DocumentVersionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "document_id" | "version" | "content" | "diff_from_previous" | "commit_hash" | "created_by" | "created_at", ExtArgs["result"]["documentVersion"]>
  export type DocumentVersionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type DocumentVersionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type DocumentVersionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    document?: boolean | DocumentDefaultArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $DocumentVersionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DocumentVersion"
    objects: {
      document: Prisma.$DocumentPayload<ExtArgs>
      creator: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      document_id: string
      version: number
      content: string
      diff_from_previous: string | null
      commit_hash: string | null
      created_by: string
      created_at: Date
    }, ExtArgs["result"]["documentVersion"]>
    composites: {}
  }

  type DocumentVersionGetPayload<S extends boolean | null | undefined | DocumentVersionDefaultArgs> = $Result.GetResult<Prisma.$DocumentVersionPayload, S>

  type DocumentVersionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DocumentVersionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DocumentVersionCountAggregateInputType | true
    }

  export interface DocumentVersionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DocumentVersion'], meta: { name: 'DocumentVersion' } }
    /**
     * Find zero or one DocumentVersion that matches the filter.
     * @param {DocumentVersionFindUniqueArgs} args - Arguments to find a DocumentVersion
     * @example
     * // Get one DocumentVersion
     * const documentVersion = await prisma.documentVersion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DocumentVersionFindUniqueArgs>(args: SelectSubset<T, DocumentVersionFindUniqueArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DocumentVersion that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DocumentVersionFindUniqueOrThrowArgs} args - Arguments to find a DocumentVersion
     * @example
     * // Get one DocumentVersion
     * const documentVersion = await prisma.documentVersion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DocumentVersionFindUniqueOrThrowArgs>(args: SelectSubset<T, DocumentVersionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DocumentVersion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionFindFirstArgs} args - Arguments to find a DocumentVersion
     * @example
     * // Get one DocumentVersion
     * const documentVersion = await prisma.documentVersion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DocumentVersionFindFirstArgs>(args?: SelectSubset<T, DocumentVersionFindFirstArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DocumentVersion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionFindFirstOrThrowArgs} args - Arguments to find a DocumentVersion
     * @example
     * // Get one DocumentVersion
     * const documentVersion = await prisma.documentVersion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DocumentVersionFindFirstOrThrowArgs>(args?: SelectSubset<T, DocumentVersionFindFirstOrThrowArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DocumentVersions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DocumentVersions
     * const documentVersions = await prisma.documentVersion.findMany()
     * 
     * // Get first 10 DocumentVersions
     * const documentVersions = await prisma.documentVersion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const documentVersionWithIdOnly = await prisma.documentVersion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DocumentVersionFindManyArgs>(args?: SelectSubset<T, DocumentVersionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DocumentVersion.
     * @param {DocumentVersionCreateArgs} args - Arguments to create a DocumentVersion.
     * @example
     * // Create one DocumentVersion
     * const DocumentVersion = await prisma.documentVersion.create({
     *   data: {
     *     // ... data to create a DocumentVersion
     *   }
     * })
     * 
     */
    create<T extends DocumentVersionCreateArgs>(args: SelectSubset<T, DocumentVersionCreateArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DocumentVersions.
     * @param {DocumentVersionCreateManyArgs} args - Arguments to create many DocumentVersions.
     * @example
     * // Create many DocumentVersions
     * const documentVersion = await prisma.documentVersion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DocumentVersionCreateManyArgs>(args?: SelectSubset<T, DocumentVersionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DocumentVersions and returns the data saved in the database.
     * @param {DocumentVersionCreateManyAndReturnArgs} args - Arguments to create many DocumentVersions.
     * @example
     * // Create many DocumentVersions
     * const documentVersion = await prisma.documentVersion.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DocumentVersions and only return the `id`
     * const documentVersionWithIdOnly = await prisma.documentVersion.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DocumentVersionCreateManyAndReturnArgs>(args?: SelectSubset<T, DocumentVersionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a DocumentVersion.
     * @param {DocumentVersionDeleteArgs} args - Arguments to delete one DocumentVersion.
     * @example
     * // Delete one DocumentVersion
     * const DocumentVersion = await prisma.documentVersion.delete({
     *   where: {
     *     // ... filter to delete one DocumentVersion
     *   }
     * })
     * 
     */
    delete<T extends DocumentVersionDeleteArgs>(args: SelectSubset<T, DocumentVersionDeleteArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DocumentVersion.
     * @param {DocumentVersionUpdateArgs} args - Arguments to update one DocumentVersion.
     * @example
     * // Update one DocumentVersion
     * const documentVersion = await prisma.documentVersion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DocumentVersionUpdateArgs>(args: SelectSubset<T, DocumentVersionUpdateArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DocumentVersions.
     * @param {DocumentVersionDeleteManyArgs} args - Arguments to filter DocumentVersions to delete.
     * @example
     * // Delete a few DocumentVersions
     * const { count } = await prisma.documentVersion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DocumentVersionDeleteManyArgs>(args?: SelectSubset<T, DocumentVersionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DocumentVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DocumentVersions
     * const documentVersion = await prisma.documentVersion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DocumentVersionUpdateManyArgs>(args: SelectSubset<T, DocumentVersionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DocumentVersions and returns the data updated in the database.
     * @param {DocumentVersionUpdateManyAndReturnArgs} args - Arguments to update many DocumentVersions.
     * @example
     * // Update many DocumentVersions
     * const documentVersion = await prisma.documentVersion.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more DocumentVersions and only return the `id`
     * const documentVersionWithIdOnly = await prisma.documentVersion.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DocumentVersionUpdateManyAndReturnArgs>(args: SelectSubset<T, DocumentVersionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one DocumentVersion.
     * @param {DocumentVersionUpsertArgs} args - Arguments to update or create a DocumentVersion.
     * @example
     * // Update or create a DocumentVersion
     * const documentVersion = await prisma.documentVersion.upsert({
     *   create: {
     *     // ... data to create a DocumentVersion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DocumentVersion we want to update
     *   }
     * })
     */
    upsert<T extends DocumentVersionUpsertArgs>(args: SelectSubset<T, DocumentVersionUpsertArgs<ExtArgs>>): Prisma__DocumentVersionClient<$Result.GetResult<Prisma.$DocumentVersionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DocumentVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionCountArgs} args - Arguments to filter DocumentVersions to count.
     * @example
     * // Count the number of DocumentVersions
     * const count = await prisma.documentVersion.count({
     *   where: {
     *     // ... the filter for the DocumentVersions we want to count
     *   }
     * })
    **/
    count<T extends DocumentVersionCountArgs>(
      args?: Subset<T, DocumentVersionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DocumentVersionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DocumentVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DocumentVersionAggregateArgs>(args: Subset<T, DocumentVersionAggregateArgs>): Prisma.PrismaPromise<GetDocumentVersionAggregateType<T>>

    /**
     * Group by DocumentVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentVersionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DocumentVersionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DocumentVersionGroupByArgs['orderBy'] }
        : { orderBy?: DocumentVersionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DocumentVersionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDocumentVersionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DocumentVersion model
   */
  readonly fields: DocumentVersionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DocumentVersion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DocumentVersionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    document<T extends DocumentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, DocumentDefaultArgs<ExtArgs>>): Prisma__DocumentClient<$Result.GetResult<Prisma.$DocumentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    creator<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DocumentVersion model
   */
  interface DocumentVersionFieldRefs {
    readonly id: FieldRef<"DocumentVersion", 'String'>
    readonly document_id: FieldRef<"DocumentVersion", 'String'>
    readonly version: FieldRef<"DocumentVersion", 'Int'>
    readonly content: FieldRef<"DocumentVersion", 'String'>
    readonly diff_from_previous: FieldRef<"DocumentVersion", 'String'>
    readonly commit_hash: FieldRef<"DocumentVersion", 'String'>
    readonly created_by: FieldRef<"DocumentVersion", 'String'>
    readonly created_at: FieldRef<"DocumentVersion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DocumentVersion findUnique
   */
  export type DocumentVersionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter, which DocumentVersion to fetch.
     */
    where: DocumentVersionWhereUniqueInput
  }

  /**
   * DocumentVersion findUniqueOrThrow
   */
  export type DocumentVersionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter, which DocumentVersion to fetch.
     */
    where: DocumentVersionWhereUniqueInput
  }

  /**
   * DocumentVersion findFirst
   */
  export type DocumentVersionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter, which DocumentVersion to fetch.
     */
    where?: DocumentVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DocumentVersions to fetch.
     */
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DocumentVersions.
     */
    cursor?: DocumentVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DocumentVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DocumentVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DocumentVersions.
     */
    distinct?: DocumentVersionScalarFieldEnum | DocumentVersionScalarFieldEnum[]
  }

  /**
   * DocumentVersion findFirstOrThrow
   */
  export type DocumentVersionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter, which DocumentVersion to fetch.
     */
    where?: DocumentVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DocumentVersions to fetch.
     */
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DocumentVersions.
     */
    cursor?: DocumentVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DocumentVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DocumentVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DocumentVersions.
     */
    distinct?: DocumentVersionScalarFieldEnum | DocumentVersionScalarFieldEnum[]
  }

  /**
   * DocumentVersion findMany
   */
  export type DocumentVersionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter, which DocumentVersions to fetch.
     */
    where?: DocumentVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DocumentVersions to fetch.
     */
    orderBy?: DocumentVersionOrderByWithRelationInput | DocumentVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DocumentVersions.
     */
    cursor?: DocumentVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DocumentVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DocumentVersions.
     */
    skip?: number
    distinct?: DocumentVersionScalarFieldEnum | DocumentVersionScalarFieldEnum[]
  }

  /**
   * DocumentVersion create
   */
  export type DocumentVersionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * The data needed to create a DocumentVersion.
     */
    data: XOR<DocumentVersionCreateInput, DocumentVersionUncheckedCreateInput>
  }

  /**
   * DocumentVersion createMany
   */
  export type DocumentVersionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DocumentVersions.
     */
    data: DocumentVersionCreateManyInput | DocumentVersionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DocumentVersion createManyAndReturn
   */
  export type DocumentVersionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * The data used to create many DocumentVersions.
     */
    data: DocumentVersionCreateManyInput | DocumentVersionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * DocumentVersion update
   */
  export type DocumentVersionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * The data needed to update a DocumentVersion.
     */
    data: XOR<DocumentVersionUpdateInput, DocumentVersionUncheckedUpdateInput>
    /**
     * Choose, which DocumentVersion to update.
     */
    where: DocumentVersionWhereUniqueInput
  }

  /**
   * DocumentVersion updateMany
   */
  export type DocumentVersionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DocumentVersions.
     */
    data: XOR<DocumentVersionUpdateManyMutationInput, DocumentVersionUncheckedUpdateManyInput>
    /**
     * Filter which DocumentVersions to update
     */
    where?: DocumentVersionWhereInput
    /**
     * Limit how many DocumentVersions to update.
     */
    limit?: number
  }

  /**
   * DocumentVersion updateManyAndReturn
   */
  export type DocumentVersionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * The data used to update DocumentVersions.
     */
    data: XOR<DocumentVersionUpdateManyMutationInput, DocumentVersionUncheckedUpdateManyInput>
    /**
     * Filter which DocumentVersions to update
     */
    where?: DocumentVersionWhereInput
    /**
     * Limit how many DocumentVersions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * DocumentVersion upsert
   */
  export type DocumentVersionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * The filter to search for the DocumentVersion to update in case it exists.
     */
    where: DocumentVersionWhereUniqueInput
    /**
     * In case the DocumentVersion found by the `where` argument doesn't exist, create a new DocumentVersion with this data.
     */
    create: XOR<DocumentVersionCreateInput, DocumentVersionUncheckedCreateInput>
    /**
     * In case the DocumentVersion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DocumentVersionUpdateInput, DocumentVersionUncheckedUpdateInput>
  }

  /**
   * DocumentVersion delete
   */
  export type DocumentVersionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
    /**
     * Filter which DocumentVersion to delete.
     */
    where: DocumentVersionWhereUniqueInput
  }

  /**
   * DocumentVersion deleteMany
   */
  export type DocumentVersionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DocumentVersions to delete
     */
    where?: DocumentVersionWhereInput
    /**
     * Limit how many DocumentVersions to delete.
     */
    limit?: number
  }

  /**
   * DocumentVersion without action
   */
  export type DocumentVersionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DocumentVersion
     */
    select?: DocumentVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DocumentVersion
     */
    omit?: DocumentVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentVersionInclude<ExtArgs> | null
  }


  /**
   * Model AiRequest
   */

  export type AggregateAiRequest = {
    _count: AiRequestCountAggregateOutputType | null
    _min: AiRequestMinAggregateOutputType | null
    _max: AiRequestMaxAggregateOutputType | null
  }

  export type AiRequestMinAggregateOutputType = {
    id: string | null
    project_id: string | null
    user_id: string | null
    type: $Enums.AiRequestType | null
    status: $Enums.AiRequestStatus | null
    prompt: string | null
    model: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type AiRequestMaxAggregateOutputType = {
    id: string | null
    project_id: string | null
    user_id: string | null
    type: $Enums.AiRequestType | null
    status: $Enums.AiRequestStatus | null
    prompt: string | null
    model: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type AiRequestCountAggregateOutputType = {
    id: number
    project_id: number
    user_id: number
    type: number
    status: number
    prompt: number
    context: number
    model: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type AiRequestMinAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    type?: true
    status?: true
    prompt?: true
    model?: true
    created_at?: true
    updated_at?: true
  }

  export type AiRequestMaxAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    type?: true
    status?: true
    prompt?: true
    model?: true
    created_at?: true
    updated_at?: true
  }

  export type AiRequestCountAggregateInputType = {
    id?: true
    project_id?: true
    user_id?: true
    type?: true
    status?: true
    prompt?: true
    context?: true
    model?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type AiRequestAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiRequest to aggregate.
     */
    where?: AiRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiRequests to fetch.
     */
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiRequests
    **/
    _count?: true | AiRequestCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiRequestMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiRequestMaxAggregateInputType
  }

  export type GetAiRequestAggregateType<T extends AiRequestAggregateArgs> = {
        [P in keyof T & keyof AggregateAiRequest]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiRequest[P]>
      : GetScalarType<T[P], AggregateAiRequest[P]>
  }




  export type AiRequestGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiRequestWhereInput
    orderBy?: AiRequestOrderByWithAggregationInput | AiRequestOrderByWithAggregationInput[]
    by: AiRequestScalarFieldEnum[] | AiRequestScalarFieldEnum
    having?: AiRequestScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiRequestCountAggregateInputType | true
    _min?: AiRequestMinAggregateInputType
    _max?: AiRequestMaxAggregateInputType
  }

  export type AiRequestGroupByOutputType = {
    id: string
    project_id: string | null
    user_id: string
    type: $Enums.AiRequestType
    status: $Enums.AiRequestStatus
    prompt: string
    context: JsonValue
    model: string
    created_at: Date
    updated_at: Date
    _count: AiRequestCountAggregateOutputType | null
    _min: AiRequestMinAggregateOutputType | null
    _max: AiRequestMaxAggregateOutputType | null
  }

  type GetAiRequestGroupByPayload<T extends AiRequestGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiRequestGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiRequestGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiRequestGroupByOutputType[P]>
            : GetScalarType<T[P], AiRequestGroupByOutputType[P]>
        }
      >
    >


  export type AiRequestSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    type?: boolean
    status?: boolean
    prompt?: boolean
    context?: boolean
    model?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    responses?: boolean | AiRequest$responsesArgs<ExtArgs>
    usage?: boolean | AiRequest$usageArgs<ExtArgs>
    _count?: boolean | AiRequestCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiRequest"]>

  export type AiRequestSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    type?: boolean
    status?: boolean
    prompt?: boolean
    context?: boolean
    model?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiRequest"]>

  export type AiRequestSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    type?: boolean
    status?: boolean
    prompt?: boolean
    context?: boolean
    model?: boolean
    created_at?: boolean
    updated_at?: boolean
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiRequest"]>

  export type AiRequestSelectScalar = {
    id?: boolean
    project_id?: boolean
    user_id?: boolean
    type?: boolean
    status?: boolean
    prompt?: boolean
    context?: boolean
    model?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type AiRequestOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "project_id" | "user_id" | "type" | "status" | "prompt" | "context" | "model" | "created_at" | "updated_at", ExtArgs["result"]["aiRequest"]>
  export type AiRequestInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    responses?: boolean | AiRequest$responsesArgs<ExtArgs>
    usage?: boolean | AiRequest$usageArgs<ExtArgs>
    _count?: boolean | AiRequestCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AiRequestIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AiRequestIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | AiRequest$projectArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AiRequestPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiRequest"
    objects: {
      project: Prisma.$ProjectPayload<ExtArgs> | null
      user: Prisma.$UserPayload<ExtArgs>
      responses: Prisma.$AiResponsePayload<ExtArgs>[]
      usage: Prisma.$UsageTrackingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      project_id: string | null
      user_id: string
      type: $Enums.AiRequestType
      status: $Enums.AiRequestStatus
      prompt: string
      context: Prisma.JsonValue
      model: string
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["aiRequest"]>
    composites: {}
  }

  type AiRequestGetPayload<S extends boolean | null | undefined | AiRequestDefaultArgs> = $Result.GetResult<Prisma.$AiRequestPayload, S>

  type AiRequestCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiRequestFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiRequestCountAggregateInputType | true
    }

  export interface AiRequestDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiRequest'], meta: { name: 'AiRequest' } }
    /**
     * Find zero or one AiRequest that matches the filter.
     * @param {AiRequestFindUniqueArgs} args - Arguments to find a AiRequest
     * @example
     * // Get one AiRequest
     * const aiRequest = await prisma.aiRequest.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiRequestFindUniqueArgs>(args: SelectSubset<T, AiRequestFindUniqueArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiRequest that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiRequestFindUniqueOrThrowArgs} args - Arguments to find a AiRequest
     * @example
     * // Get one AiRequest
     * const aiRequest = await prisma.aiRequest.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiRequestFindUniqueOrThrowArgs>(args: SelectSubset<T, AiRequestFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiRequest that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestFindFirstArgs} args - Arguments to find a AiRequest
     * @example
     * // Get one AiRequest
     * const aiRequest = await prisma.aiRequest.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiRequestFindFirstArgs>(args?: SelectSubset<T, AiRequestFindFirstArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiRequest that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestFindFirstOrThrowArgs} args - Arguments to find a AiRequest
     * @example
     * // Get one AiRequest
     * const aiRequest = await prisma.aiRequest.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiRequestFindFirstOrThrowArgs>(args?: SelectSubset<T, AiRequestFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiRequests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiRequests
     * const aiRequests = await prisma.aiRequest.findMany()
     * 
     * // Get first 10 AiRequests
     * const aiRequests = await prisma.aiRequest.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiRequestWithIdOnly = await prisma.aiRequest.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiRequestFindManyArgs>(args?: SelectSubset<T, AiRequestFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiRequest.
     * @param {AiRequestCreateArgs} args - Arguments to create a AiRequest.
     * @example
     * // Create one AiRequest
     * const AiRequest = await prisma.aiRequest.create({
     *   data: {
     *     // ... data to create a AiRequest
     *   }
     * })
     * 
     */
    create<T extends AiRequestCreateArgs>(args: SelectSubset<T, AiRequestCreateArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiRequests.
     * @param {AiRequestCreateManyArgs} args - Arguments to create many AiRequests.
     * @example
     * // Create many AiRequests
     * const aiRequest = await prisma.aiRequest.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiRequestCreateManyArgs>(args?: SelectSubset<T, AiRequestCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiRequests and returns the data saved in the database.
     * @param {AiRequestCreateManyAndReturnArgs} args - Arguments to create many AiRequests.
     * @example
     * // Create many AiRequests
     * const aiRequest = await prisma.aiRequest.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiRequests and only return the `id`
     * const aiRequestWithIdOnly = await prisma.aiRequest.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiRequestCreateManyAndReturnArgs>(args?: SelectSubset<T, AiRequestCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiRequest.
     * @param {AiRequestDeleteArgs} args - Arguments to delete one AiRequest.
     * @example
     * // Delete one AiRequest
     * const AiRequest = await prisma.aiRequest.delete({
     *   where: {
     *     // ... filter to delete one AiRequest
     *   }
     * })
     * 
     */
    delete<T extends AiRequestDeleteArgs>(args: SelectSubset<T, AiRequestDeleteArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiRequest.
     * @param {AiRequestUpdateArgs} args - Arguments to update one AiRequest.
     * @example
     * // Update one AiRequest
     * const aiRequest = await prisma.aiRequest.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiRequestUpdateArgs>(args: SelectSubset<T, AiRequestUpdateArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiRequests.
     * @param {AiRequestDeleteManyArgs} args - Arguments to filter AiRequests to delete.
     * @example
     * // Delete a few AiRequests
     * const { count } = await prisma.aiRequest.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiRequestDeleteManyArgs>(args?: SelectSubset<T, AiRequestDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiRequests
     * const aiRequest = await prisma.aiRequest.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiRequestUpdateManyArgs>(args: SelectSubset<T, AiRequestUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiRequests and returns the data updated in the database.
     * @param {AiRequestUpdateManyAndReturnArgs} args - Arguments to update many AiRequests.
     * @example
     * // Update many AiRequests
     * const aiRequest = await prisma.aiRequest.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiRequests and only return the `id`
     * const aiRequestWithIdOnly = await prisma.aiRequest.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiRequestUpdateManyAndReturnArgs>(args: SelectSubset<T, AiRequestUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiRequest.
     * @param {AiRequestUpsertArgs} args - Arguments to update or create a AiRequest.
     * @example
     * // Update or create a AiRequest
     * const aiRequest = await prisma.aiRequest.upsert({
     *   create: {
     *     // ... data to create a AiRequest
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiRequest we want to update
     *   }
     * })
     */
    upsert<T extends AiRequestUpsertArgs>(args: SelectSubset<T, AiRequestUpsertArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestCountArgs} args - Arguments to filter AiRequests to count.
     * @example
     * // Count the number of AiRequests
     * const count = await prisma.aiRequest.count({
     *   where: {
     *     // ... the filter for the AiRequests we want to count
     *   }
     * })
    **/
    count<T extends AiRequestCountArgs>(
      args?: Subset<T, AiRequestCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiRequestCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiRequestAggregateArgs>(args: Subset<T, AiRequestAggregateArgs>): Prisma.PrismaPromise<GetAiRequestAggregateType<T>>

    /**
     * Group by AiRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiRequestGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiRequestGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiRequestGroupByArgs['orderBy'] }
        : { orderBy?: AiRequestGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiRequestGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiRequestGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiRequest model
   */
  readonly fields: AiRequestFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiRequest.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiRequestClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    project<T extends AiRequest$projectArgs<ExtArgs> = {}>(args?: Subset<T, AiRequest$projectArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    responses<T extends AiRequest$responsesArgs<ExtArgs> = {}>(args?: Subset<T, AiRequest$responsesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    usage<T extends AiRequest$usageArgs<ExtArgs> = {}>(args?: Subset<T, AiRequest$usageArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiRequest model
   */
  interface AiRequestFieldRefs {
    readonly id: FieldRef<"AiRequest", 'String'>
    readonly project_id: FieldRef<"AiRequest", 'String'>
    readonly user_id: FieldRef<"AiRequest", 'String'>
    readonly type: FieldRef<"AiRequest", 'AiRequestType'>
    readonly status: FieldRef<"AiRequest", 'AiRequestStatus'>
    readonly prompt: FieldRef<"AiRequest", 'String'>
    readonly context: FieldRef<"AiRequest", 'Json'>
    readonly model: FieldRef<"AiRequest", 'String'>
    readonly created_at: FieldRef<"AiRequest", 'DateTime'>
    readonly updated_at: FieldRef<"AiRequest", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiRequest findUnique
   */
  export type AiRequestFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter, which AiRequest to fetch.
     */
    where: AiRequestWhereUniqueInput
  }

  /**
   * AiRequest findUniqueOrThrow
   */
  export type AiRequestFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter, which AiRequest to fetch.
     */
    where: AiRequestWhereUniqueInput
  }

  /**
   * AiRequest findFirst
   */
  export type AiRequestFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter, which AiRequest to fetch.
     */
    where?: AiRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiRequests to fetch.
     */
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiRequests.
     */
    cursor?: AiRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiRequests.
     */
    distinct?: AiRequestScalarFieldEnum | AiRequestScalarFieldEnum[]
  }

  /**
   * AiRequest findFirstOrThrow
   */
  export type AiRequestFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter, which AiRequest to fetch.
     */
    where?: AiRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiRequests to fetch.
     */
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiRequests.
     */
    cursor?: AiRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiRequests.
     */
    distinct?: AiRequestScalarFieldEnum | AiRequestScalarFieldEnum[]
  }

  /**
   * AiRequest findMany
   */
  export type AiRequestFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter, which AiRequests to fetch.
     */
    where?: AiRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiRequests to fetch.
     */
    orderBy?: AiRequestOrderByWithRelationInput | AiRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiRequests.
     */
    cursor?: AiRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiRequests.
     */
    skip?: number
    distinct?: AiRequestScalarFieldEnum | AiRequestScalarFieldEnum[]
  }

  /**
   * AiRequest create
   */
  export type AiRequestCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * The data needed to create a AiRequest.
     */
    data: XOR<AiRequestCreateInput, AiRequestUncheckedCreateInput>
  }

  /**
   * AiRequest createMany
   */
  export type AiRequestCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiRequests.
     */
    data: AiRequestCreateManyInput | AiRequestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiRequest createManyAndReturn
   */
  export type AiRequestCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * The data used to create many AiRequests.
     */
    data: AiRequestCreateManyInput | AiRequestCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiRequest update
   */
  export type AiRequestUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * The data needed to update a AiRequest.
     */
    data: XOR<AiRequestUpdateInput, AiRequestUncheckedUpdateInput>
    /**
     * Choose, which AiRequest to update.
     */
    where: AiRequestWhereUniqueInput
  }

  /**
   * AiRequest updateMany
   */
  export type AiRequestUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiRequests.
     */
    data: XOR<AiRequestUpdateManyMutationInput, AiRequestUncheckedUpdateManyInput>
    /**
     * Filter which AiRequests to update
     */
    where?: AiRequestWhereInput
    /**
     * Limit how many AiRequests to update.
     */
    limit?: number
  }

  /**
   * AiRequest updateManyAndReturn
   */
  export type AiRequestUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * The data used to update AiRequests.
     */
    data: XOR<AiRequestUpdateManyMutationInput, AiRequestUncheckedUpdateManyInput>
    /**
     * Filter which AiRequests to update
     */
    where?: AiRequestWhereInput
    /**
     * Limit how many AiRequests to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiRequest upsert
   */
  export type AiRequestUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * The filter to search for the AiRequest to update in case it exists.
     */
    where: AiRequestWhereUniqueInput
    /**
     * In case the AiRequest found by the `where` argument doesn't exist, create a new AiRequest with this data.
     */
    create: XOR<AiRequestCreateInput, AiRequestUncheckedCreateInput>
    /**
     * In case the AiRequest was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiRequestUpdateInput, AiRequestUncheckedUpdateInput>
  }

  /**
   * AiRequest delete
   */
  export type AiRequestDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
    /**
     * Filter which AiRequest to delete.
     */
    where: AiRequestWhereUniqueInput
  }

  /**
   * AiRequest deleteMany
   */
  export type AiRequestDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiRequests to delete
     */
    where?: AiRequestWhereInput
    /**
     * Limit how many AiRequests to delete.
     */
    limit?: number
  }

  /**
   * AiRequest.project
   */
  export type AiRequest$projectArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    where?: ProjectWhereInput
  }

  /**
   * AiRequest.responses
   */
  export type AiRequest$responsesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    where?: AiResponseWhereInput
    orderBy?: AiResponseOrderByWithRelationInput | AiResponseOrderByWithRelationInput[]
    cursor?: AiResponseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AiResponseScalarFieldEnum | AiResponseScalarFieldEnum[]
  }

  /**
   * AiRequest.usage
   */
  export type AiRequest$usageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    where?: UsageTrackingWhereInput
    orderBy?: UsageTrackingOrderByWithRelationInput | UsageTrackingOrderByWithRelationInput[]
    cursor?: UsageTrackingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UsageTrackingScalarFieldEnum | UsageTrackingScalarFieldEnum[]
  }

  /**
   * AiRequest without action
   */
  export type AiRequestDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiRequest
     */
    select?: AiRequestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiRequest
     */
    omit?: AiRequestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiRequestInclude<ExtArgs> | null
  }


  /**
   * Model AiResponse
   */

  export type AggregateAiResponse = {
    _count: AiResponseCountAggregateOutputType | null
    _avg: AiResponseAvgAggregateOutputType | null
    _sum: AiResponseSumAggregateOutputType | null
    _min: AiResponseMinAggregateOutputType | null
    _max: AiResponseMaxAggregateOutputType | null
  }

  export type AiResponseAvgAggregateOutputType = {
    tokens_used: number | null
  }

  export type AiResponseSumAggregateOutputType = {
    tokens_used: number | null
  }

  export type AiResponseMinAggregateOutputType = {
    id: string | null
    request_id: string | null
    content: string | null
    tokens_used: number | null
    model: string | null
    finish_reason: string | null
    created_at: Date | null
  }

  export type AiResponseMaxAggregateOutputType = {
    id: string | null
    request_id: string | null
    content: string | null
    tokens_used: number | null
    model: string | null
    finish_reason: string | null
    created_at: Date | null
  }

  export type AiResponseCountAggregateOutputType = {
    id: number
    request_id: number
    content: number
    tokens_used: number
    model: number
    finish_reason: number
    metadata: number
    created_at: number
    _all: number
  }


  export type AiResponseAvgAggregateInputType = {
    tokens_used?: true
  }

  export type AiResponseSumAggregateInputType = {
    tokens_used?: true
  }

  export type AiResponseMinAggregateInputType = {
    id?: true
    request_id?: true
    content?: true
    tokens_used?: true
    model?: true
    finish_reason?: true
    created_at?: true
  }

  export type AiResponseMaxAggregateInputType = {
    id?: true
    request_id?: true
    content?: true
    tokens_used?: true
    model?: true
    finish_reason?: true
    created_at?: true
  }

  export type AiResponseCountAggregateInputType = {
    id?: true
    request_id?: true
    content?: true
    tokens_used?: true
    model?: true
    finish_reason?: true
    metadata?: true
    created_at?: true
    _all?: true
  }

  export type AiResponseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiResponse to aggregate.
     */
    where?: AiResponseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiResponses to fetch.
     */
    orderBy?: AiResponseOrderByWithRelationInput | AiResponseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AiResponseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiResponses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiResponses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AiResponses
    **/
    _count?: true | AiResponseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AiResponseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AiResponseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AiResponseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AiResponseMaxAggregateInputType
  }

  export type GetAiResponseAggregateType<T extends AiResponseAggregateArgs> = {
        [P in keyof T & keyof AggregateAiResponse]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAiResponse[P]>
      : GetScalarType<T[P], AggregateAiResponse[P]>
  }




  export type AiResponseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AiResponseWhereInput
    orderBy?: AiResponseOrderByWithAggregationInput | AiResponseOrderByWithAggregationInput[]
    by: AiResponseScalarFieldEnum[] | AiResponseScalarFieldEnum
    having?: AiResponseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AiResponseCountAggregateInputType | true
    _avg?: AiResponseAvgAggregateInputType
    _sum?: AiResponseSumAggregateInputType
    _min?: AiResponseMinAggregateInputType
    _max?: AiResponseMaxAggregateInputType
  }

  export type AiResponseGroupByOutputType = {
    id: string
    request_id: string
    content: string
    tokens_used: number
    model: string
    finish_reason: string | null
    metadata: JsonValue
    created_at: Date
    _count: AiResponseCountAggregateOutputType | null
    _avg: AiResponseAvgAggregateOutputType | null
    _sum: AiResponseSumAggregateOutputType | null
    _min: AiResponseMinAggregateOutputType | null
    _max: AiResponseMaxAggregateOutputType | null
  }

  type GetAiResponseGroupByPayload<T extends AiResponseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AiResponseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AiResponseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AiResponseGroupByOutputType[P]>
            : GetScalarType<T[P], AiResponseGroupByOutputType[P]>
        }
      >
    >


  export type AiResponseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    content?: boolean
    tokens_used?: boolean
    model?: boolean
    finish_reason?: boolean
    metadata?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiResponse"]>

  export type AiResponseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    content?: boolean
    tokens_used?: boolean
    model?: boolean
    finish_reason?: boolean
    metadata?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiResponse"]>

  export type AiResponseSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    content?: boolean
    tokens_used?: boolean
    model?: boolean
    finish_reason?: boolean
    metadata?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aiResponse"]>

  export type AiResponseSelectScalar = {
    id?: boolean
    request_id?: boolean
    content?: boolean
    tokens_used?: boolean
    model?: boolean
    finish_reason?: boolean
    metadata?: boolean
    created_at?: boolean
  }

  export type AiResponseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "request_id" | "content" | "tokens_used" | "model" | "finish_reason" | "metadata" | "created_at", ExtArgs["result"]["aiResponse"]>
  export type AiResponseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }
  export type AiResponseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }
  export type AiResponseIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }

  export type $AiResponsePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AiResponse"
    objects: {
      request: Prisma.$AiRequestPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      request_id: string
      content: string
      tokens_used: number
      model: string
      finish_reason: string | null
      metadata: Prisma.JsonValue
      created_at: Date
    }, ExtArgs["result"]["aiResponse"]>
    composites: {}
  }

  type AiResponseGetPayload<S extends boolean | null | undefined | AiResponseDefaultArgs> = $Result.GetResult<Prisma.$AiResponsePayload, S>

  type AiResponseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AiResponseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AiResponseCountAggregateInputType | true
    }

  export interface AiResponseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AiResponse'], meta: { name: 'AiResponse' } }
    /**
     * Find zero or one AiResponse that matches the filter.
     * @param {AiResponseFindUniqueArgs} args - Arguments to find a AiResponse
     * @example
     * // Get one AiResponse
     * const aiResponse = await prisma.aiResponse.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AiResponseFindUniqueArgs>(args: SelectSubset<T, AiResponseFindUniqueArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AiResponse that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AiResponseFindUniqueOrThrowArgs} args - Arguments to find a AiResponse
     * @example
     * // Get one AiResponse
     * const aiResponse = await prisma.aiResponse.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AiResponseFindUniqueOrThrowArgs>(args: SelectSubset<T, AiResponseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiResponse that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseFindFirstArgs} args - Arguments to find a AiResponse
     * @example
     * // Get one AiResponse
     * const aiResponse = await prisma.aiResponse.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AiResponseFindFirstArgs>(args?: SelectSubset<T, AiResponseFindFirstArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AiResponse that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseFindFirstOrThrowArgs} args - Arguments to find a AiResponse
     * @example
     * // Get one AiResponse
     * const aiResponse = await prisma.aiResponse.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AiResponseFindFirstOrThrowArgs>(args?: SelectSubset<T, AiResponseFindFirstOrThrowArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AiResponses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AiResponses
     * const aiResponses = await prisma.aiResponse.findMany()
     * 
     * // Get first 10 AiResponses
     * const aiResponses = await prisma.aiResponse.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aiResponseWithIdOnly = await prisma.aiResponse.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AiResponseFindManyArgs>(args?: SelectSubset<T, AiResponseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AiResponse.
     * @param {AiResponseCreateArgs} args - Arguments to create a AiResponse.
     * @example
     * // Create one AiResponse
     * const AiResponse = await prisma.aiResponse.create({
     *   data: {
     *     // ... data to create a AiResponse
     *   }
     * })
     * 
     */
    create<T extends AiResponseCreateArgs>(args: SelectSubset<T, AiResponseCreateArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AiResponses.
     * @param {AiResponseCreateManyArgs} args - Arguments to create many AiResponses.
     * @example
     * // Create many AiResponses
     * const aiResponse = await prisma.aiResponse.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AiResponseCreateManyArgs>(args?: SelectSubset<T, AiResponseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AiResponses and returns the data saved in the database.
     * @param {AiResponseCreateManyAndReturnArgs} args - Arguments to create many AiResponses.
     * @example
     * // Create many AiResponses
     * const aiResponse = await prisma.aiResponse.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AiResponses and only return the `id`
     * const aiResponseWithIdOnly = await prisma.aiResponse.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AiResponseCreateManyAndReturnArgs>(args?: SelectSubset<T, AiResponseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AiResponse.
     * @param {AiResponseDeleteArgs} args - Arguments to delete one AiResponse.
     * @example
     * // Delete one AiResponse
     * const AiResponse = await prisma.aiResponse.delete({
     *   where: {
     *     // ... filter to delete one AiResponse
     *   }
     * })
     * 
     */
    delete<T extends AiResponseDeleteArgs>(args: SelectSubset<T, AiResponseDeleteArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AiResponse.
     * @param {AiResponseUpdateArgs} args - Arguments to update one AiResponse.
     * @example
     * // Update one AiResponse
     * const aiResponse = await prisma.aiResponse.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AiResponseUpdateArgs>(args: SelectSubset<T, AiResponseUpdateArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AiResponses.
     * @param {AiResponseDeleteManyArgs} args - Arguments to filter AiResponses to delete.
     * @example
     * // Delete a few AiResponses
     * const { count } = await prisma.aiResponse.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AiResponseDeleteManyArgs>(args?: SelectSubset<T, AiResponseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiResponses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AiResponses
     * const aiResponse = await prisma.aiResponse.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AiResponseUpdateManyArgs>(args: SelectSubset<T, AiResponseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AiResponses and returns the data updated in the database.
     * @param {AiResponseUpdateManyAndReturnArgs} args - Arguments to update many AiResponses.
     * @example
     * // Update many AiResponses
     * const aiResponse = await prisma.aiResponse.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AiResponses and only return the `id`
     * const aiResponseWithIdOnly = await prisma.aiResponse.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AiResponseUpdateManyAndReturnArgs>(args: SelectSubset<T, AiResponseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AiResponse.
     * @param {AiResponseUpsertArgs} args - Arguments to update or create a AiResponse.
     * @example
     * // Update or create a AiResponse
     * const aiResponse = await prisma.aiResponse.upsert({
     *   create: {
     *     // ... data to create a AiResponse
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AiResponse we want to update
     *   }
     * })
     */
    upsert<T extends AiResponseUpsertArgs>(args: SelectSubset<T, AiResponseUpsertArgs<ExtArgs>>): Prisma__AiResponseClient<$Result.GetResult<Prisma.$AiResponsePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AiResponses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseCountArgs} args - Arguments to filter AiResponses to count.
     * @example
     * // Count the number of AiResponses
     * const count = await prisma.aiResponse.count({
     *   where: {
     *     // ... the filter for the AiResponses we want to count
     *   }
     * })
    **/
    count<T extends AiResponseCountArgs>(
      args?: Subset<T, AiResponseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AiResponseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AiResponse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AiResponseAggregateArgs>(args: Subset<T, AiResponseAggregateArgs>): Prisma.PrismaPromise<GetAiResponseAggregateType<T>>

    /**
     * Group by AiResponse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AiResponseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AiResponseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AiResponseGroupByArgs['orderBy'] }
        : { orderBy?: AiResponseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AiResponseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAiResponseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AiResponse model
   */
  readonly fields: AiResponseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AiResponse.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AiResponseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    request<T extends AiRequestDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AiRequestDefaultArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AiResponse model
   */
  interface AiResponseFieldRefs {
    readonly id: FieldRef<"AiResponse", 'String'>
    readonly request_id: FieldRef<"AiResponse", 'String'>
    readonly content: FieldRef<"AiResponse", 'String'>
    readonly tokens_used: FieldRef<"AiResponse", 'Int'>
    readonly model: FieldRef<"AiResponse", 'String'>
    readonly finish_reason: FieldRef<"AiResponse", 'String'>
    readonly metadata: FieldRef<"AiResponse", 'Json'>
    readonly created_at: FieldRef<"AiResponse", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AiResponse findUnique
   */
  export type AiResponseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter, which AiResponse to fetch.
     */
    where: AiResponseWhereUniqueInput
  }

  /**
   * AiResponse findUniqueOrThrow
   */
  export type AiResponseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter, which AiResponse to fetch.
     */
    where: AiResponseWhereUniqueInput
  }

  /**
   * AiResponse findFirst
   */
  export type AiResponseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter, which AiResponse to fetch.
     */
    where?: AiResponseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiResponses to fetch.
     */
    orderBy?: AiResponseOrderByWithRelationInput | AiResponseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiResponses.
     */
    cursor?: AiResponseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiResponses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiResponses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiResponses.
     */
    distinct?: AiResponseScalarFieldEnum | AiResponseScalarFieldEnum[]
  }

  /**
   * AiResponse findFirstOrThrow
   */
  export type AiResponseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter, which AiResponse to fetch.
     */
    where?: AiResponseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiResponses to fetch.
     */
    orderBy?: AiResponseOrderByWithRelationInput | AiResponseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AiResponses.
     */
    cursor?: AiResponseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiResponses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiResponses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AiResponses.
     */
    distinct?: AiResponseScalarFieldEnum | AiResponseScalarFieldEnum[]
  }

  /**
   * AiResponse findMany
   */
  export type AiResponseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter, which AiResponses to fetch.
     */
    where?: AiResponseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AiResponses to fetch.
     */
    orderBy?: AiResponseOrderByWithRelationInput | AiResponseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AiResponses.
     */
    cursor?: AiResponseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AiResponses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AiResponses.
     */
    skip?: number
    distinct?: AiResponseScalarFieldEnum | AiResponseScalarFieldEnum[]
  }

  /**
   * AiResponse create
   */
  export type AiResponseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * The data needed to create a AiResponse.
     */
    data: XOR<AiResponseCreateInput, AiResponseUncheckedCreateInput>
  }

  /**
   * AiResponse createMany
   */
  export type AiResponseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AiResponses.
     */
    data: AiResponseCreateManyInput | AiResponseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AiResponse createManyAndReturn
   */
  export type AiResponseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * The data used to create many AiResponses.
     */
    data: AiResponseCreateManyInput | AiResponseCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiResponse update
   */
  export type AiResponseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * The data needed to update a AiResponse.
     */
    data: XOR<AiResponseUpdateInput, AiResponseUncheckedUpdateInput>
    /**
     * Choose, which AiResponse to update.
     */
    where: AiResponseWhereUniqueInput
  }

  /**
   * AiResponse updateMany
   */
  export type AiResponseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AiResponses.
     */
    data: XOR<AiResponseUpdateManyMutationInput, AiResponseUncheckedUpdateManyInput>
    /**
     * Filter which AiResponses to update
     */
    where?: AiResponseWhereInput
    /**
     * Limit how many AiResponses to update.
     */
    limit?: number
  }

  /**
   * AiResponse updateManyAndReturn
   */
  export type AiResponseUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * The data used to update AiResponses.
     */
    data: XOR<AiResponseUpdateManyMutationInput, AiResponseUncheckedUpdateManyInput>
    /**
     * Filter which AiResponses to update
     */
    where?: AiResponseWhereInput
    /**
     * Limit how many AiResponses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AiResponse upsert
   */
  export type AiResponseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * The filter to search for the AiResponse to update in case it exists.
     */
    where: AiResponseWhereUniqueInput
    /**
     * In case the AiResponse found by the `where` argument doesn't exist, create a new AiResponse with this data.
     */
    create: XOR<AiResponseCreateInput, AiResponseUncheckedCreateInput>
    /**
     * In case the AiResponse was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AiResponseUpdateInput, AiResponseUncheckedUpdateInput>
  }

  /**
   * AiResponse delete
   */
  export type AiResponseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
    /**
     * Filter which AiResponse to delete.
     */
    where: AiResponseWhereUniqueInput
  }

  /**
   * AiResponse deleteMany
   */
  export type AiResponseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AiResponses to delete
     */
    where?: AiResponseWhereInput
    /**
     * Limit how many AiResponses to delete.
     */
    limit?: number
  }

  /**
   * AiResponse without action
   */
  export type AiResponseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AiResponse
     */
    select?: AiResponseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AiResponse
     */
    omit?: AiResponseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AiResponseInclude<ExtArgs> | null
  }


  /**
   * Model UsageTracking
   */

  export type AggregateUsageTracking = {
    _count: UsageTrackingCountAggregateOutputType | null
    _avg: UsageTrackingAvgAggregateOutputType | null
    _sum: UsageTrackingSumAggregateOutputType | null
    _min: UsageTrackingMinAggregateOutputType | null
    _max: UsageTrackingMaxAggregateOutputType | null
  }

  export type UsageTrackingAvgAggregateOutputType = {
    prompt_tokens: number | null
    completion_tokens: number | null
    total_tokens: number | null
    cost_estimate: Decimal | null
  }

  export type UsageTrackingSumAggregateOutputType = {
    prompt_tokens: number | null
    completion_tokens: number | null
    total_tokens: number | null
    cost_estimate: Decimal | null
  }

  export type UsageTrackingMinAggregateOutputType = {
    id: string | null
    request_id: string | null
    model: string | null
    prompt_tokens: number | null
    completion_tokens: number | null
    total_tokens: number | null
    cost_estimate: Decimal | null
    created_at: Date | null
  }

  export type UsageTrackingMaxAggregateOutputType = {
    id: string | null
    request_id: string | null
    model: string | null
    prompt_tokens: number | null
    completion_tokens: number | null
    total_tokens: number | null
    cost_estimate: Decimal | null
    created_at: Date | null
  }

  export type UsageTrackingCountAggregateOutputType = {
    id: number
    request_id: number
    model: number
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate: number
    created_at: number
    _all: number
  }


  export type UsageTrackingAvgAggregateInputType = {
    prompt_tokens?: true
    completion_tokens?: true
    total_tokens?: true
    cost_estimate?: true
  }

  export type UsageTrackingSumAggregateInputType = {
    prompt_tokens?: true
    completion_tokens?: true
    total_tokens?: true
    cost_estimate?: true
  }

  export type UsageTrackingMinAggregateInputType = {
    id?: true
    request_id?: true
    model?: true
    prompt_tokens?: true
    completion_tokens?: true
    total_tokens?: true
    cost_estimate?: true
    created_at?: true
  }

  export type UsageTrackingMaxAggregateInputType = {
    id?: true
    request_id?: true
    model?: true
    prompt_tokens?: true
    completion_tokens?: true
    total_tokens?: true
    cost_estimate?: true
    created_at?: true
  }

  export type UsageTrackingCountAggregateInputType = {
    id?: true
    request_id?: true
    model?: true
    prompt_tokens?: true
    completion_tokens?: true
    total_tokens?: true
    cost_estimate?: true
    created_at?: true
    _all?: true
  }

  export type UsageTrackingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UsageTracking to aggregate.
     */
    where?: UsageTrackingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageTrackings to fetch.
     */
    orderBy?: UsageTrackingOrderByWithRelationInput | UsageTrackingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UsageTrackingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageTrackings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageTrackings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UsageTrackings
    **/
    _count?: true | UsageTrackingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsageTrackingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsageTrackingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsageTrackingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsageTrackingMaxAggregateInputType
  }

  export type GetUsageTrackingAggregateType<T extends UsageTrackingAggregateArgs> = {
        [P in keyof T & keyof AggregateUsageTracking]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsageTracking[P]>
      : GetScalarType<T[P], AggregateUsageTracking[P]>
  }




  export type UsageTrackingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsageTrackingWhereInput
    orderBy?: UsageTrackingOrderByWithAggregationInput | UsageTrackingOrderByWithAggregationInput[]
    by: UsageTrackingScalarFieldEnum[] | UsageTrackingScalarFieldEnum
    having?: UsageTrackingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsageTrackingCountAggregateInputType | true
    _avg?: UsageTrackingAvgAggregateInputType
    _sum?: UsageTrackingSumAggregateInputType
    _min?: UsageTrackingMinAggregateInputType
    _max?: UsageTrackingMaxAggregateInputType
  }

  export type UsageTrackingGroupByOutputType = {
    id: string
    request_id: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate: Decimal | null
    created_at: Date
    _count: UsageTrackingCountAggregateOutputType | null
    _avg: UsageTrackingAvgAggregateOutputType | null
    _sum: UsageTrackingSumAggregateOutputType | null
    _min: UsageTrackingMinAggregateOutputType | null
    _max: UsageTrackingMaxAggregateOutputType | null
  }

  type GetUsageTrackingGroupByPayload<T extends UsageTrackingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsageTrackingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsageTrackingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsageTrackingGroupByOutputType[P]>
            : GetScalarType<T[P], UsageTrackingGroupByOutputType[P]>
        }
      >
    >


  export type UsageTrackingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    model?: boolean
    prompt_tokens?: boolean
    completion_tokens?: boolean
    total_tokens?: boolean
    cost_estimate?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageTracking"]>

  export type UsageTrackingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    model?: boolean
    prompt_tokens?: boolean
    completion_tokens?: boolean
    total_tokens?: boolean
    cost_estimate?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageTracking"]>

  export type UsageTrackingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    request_id?: boolean
    model?: boolean
    prompt_tokens?: boolean
    completion_tokens?: boolean
    total_tokens?: boolean
    cost_estimate?: boolean
    created_at?: boolean
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageTracking"]>

  export type UsageTrackingSelectScalar = {
    id?: boolean
    request_id?: boolean
    model?: boolean
    prompt_tokens?: boolean
    completion_tokens?: boolean
    total_tokens?: boolean
    cost_estimate?: boolean
    created_at?: boolean
  }

  export type UsageTrackingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "request_id" | "model" | "prompt_tokens" | "completion_tokens" | "total_tokens" | "cost_estimate" | "created_at", ExtArgs["result"]["usageTracking"]>
  export type UsageTrackingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }
  export type UsageTrackingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }
  export type UsageTrackingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    request?: boolean | AiRequestDefaultArgs<ExtArgs>
  }

  export type $UsageTrackingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UsageTracking"
    objects: {
      request: Prisma.$AiRequestPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      request_id: string
      model: string
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
      cost_estimate: Prisma.Decimal | null
      created_at: Date
    }, ExtArgs["result"]["usageTracking"]>
    composites: {}
  }

  type UsageTrackingGetPayload<S extends boolean | null | undefined | UsageTrackingDefaultArgs> = $Result.GetResult<Prisma.$UsageTrackingPayload, S>

  type UsageTrackingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UsageTrackingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsageTrackingCountAggregateInputType | true
    }

  export interface UsageTrackingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UsageTracking'], meta: { name: 'UsageTracking' } }
    /**
     * Find zero or one UsageTracking that matches the filter.
     * @param {UsageTrackingFindUniqueArgs} args - Arguments to find a UsageTracking
     * @example
     * // Get one UsageTracking
     * const usageTracking = await prisma.usageTracking.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UsageTrackingFindUniqueArgs>(args: SelectSubset<T, UsageTrackingFindUniqueArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UsageTracking that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UsageTrackingFindUniqueOrThrowArgs} args - Arguments to find a UsageTracking
     * @example
     * // Get one UsageTracking
     * const usageTracking = await prisma.usageTracking.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UsageTrackingFindUniqueOrThrowArgs>(args: SelectSubset<T, UsageTrackingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UsageTracking that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingFindFirstArgs} args - Arguments to find a UsageTracking
     * @example
     * // Get one UsageTracking
     * const usageTracking = await prisma.usageTracking.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UsageTrackingFindFirstArgs>(args?: SelectSubset<T, UsageTrackingFindFirstArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UsageTracking that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingFindFirstOrThrowArgs} args - Arguments to find a UsageTracking
     * @example
     * // Get one UsageTracking
     * const usageTracking = await prisma.usageTracking.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UsageTrackingFindFirstOrThrowArgs>(args?: SelectSubset<T, UsageTrackingFindFirstOrThrowArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UsageTrackings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UsageTrackings
     * const usageTrackings = await prisma.usageTracking.findMany()
     * 
     * // Get first 10 UsageTrackings
     * const usageTrackings = await prisma.usageTracking.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usageTrackingWithIdOnly = await prisma.usageTracking.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UsageTrackingFindManyArgs>(args?: SelectSubset<T, UsageTrackingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UsageTracking.
     * @param {UsageTrackingCreateArgs} args - Arguments to create a UsageTracking.
     * @example
     * // Create one UsageTracking
     * const UsageTracking = await prisma.usageTracking.create({
     *   data: {
     *     // ... data to create a UsageTracking
     *   }
     * })
     * 
     */
    create<T extends UsageTrackingCreateArgs>(args: SelectSubset<T, UsageTrackingCreateArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UsageTrackings.
     * @param {UsageTrackingCreateManyArgs} args - Arguments to create many UsageTrackings.
     * @example
     * // Create many UsageTrackings
     * const usageTracking = await prisma.usageTracking.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UsageTrackingCreateManyArgs>(args?: SelectSubset<T, UsageTrackingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UsageTrackings and returns the data saved in the database.
     * @param {UsageTrackingCreateManyAndReturnArgs} args - Arguments to create many UsageTrackings.
     * @example
     * // Create many UsageTrackings
     * const usageTracking = await prisma.usageTracking.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UsageTrackings and only return the `id`
     * const usageTrackingWithIdOnly = await prisma.usageTracking.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UsageTrackingCreateManyAndReturnArgs>(args?: SelectSubset<T, UsageTrackingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UsageTracking.
     * @param {UsageTrackingDeleteArgs} args - Arguments to delete one UsageTracking.
     * @example
     * // Delete one UsageTracking
     * const UsageTracking = await prisma.usageTracking.delete({
     *   where: {
     *     // ... filter to delete one UsageTracking
     *   }
     * })
     * 
     */
    delete<T extends UsageTrackingDeleteArgs>(args: SelectSubset<T, UsageTrackingDeleteArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UsageTracking.
     * @param {UsageTrackingUpdateArgs} args - Arguments to update one UsageTracking.
     * @example
     * // Update one UsageTracking
     * const usageTracking = await prisma.usageTracking.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UsageTrackingUpdateArgs>(args: SelectSubset<T, UsageTrackingUpdateArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UsageTrackings.
     * @param {UsageTrackingDeleteManyArgs} args - Arguments to filter UsageTrackings to delete.
     * @example
     * // Delete a few UsageTrackings
     * const { count } = await prisma.usageTracking.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UsageTrackingDeleteManyArgs>(args?: SelectSubset<T, UsageTrackingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UsageTrackings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UsageTrackings
     * const usageTracking = await prisma.usageTracking.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UsageTrackingUpdateManyArgs>(args: SelectSubset<T, UsageTrackingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UsageTrackings and returns the data updated in the database.
     * @param {UsageTrackingUpdateManyAndReturnArgs} args - Arguments to update many UsageTrackings.
     * @example
     * // Update many UsageTrackings
     * const usageTracking = await prisma.usageTracking.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UsageTrackings and only return the `id`
     * const usageTrackingWithIdOnly = await prisma.usageTracking.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UsageTrackingUpdateManyAndReturnArgs>(args: SelectSubset<T, UsageTrackingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UsageTracking.
     * @param {UsageTrackingUpsertArgs} args - Arguments to update or create a UsageTracking.
     * @example
     * // Update or create a UsageTracking
     * const usageTracking = await prisma.usageTracking.upsert({
     *   create: {
     *     // ... data to create a UsageTracking
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UsageTracking we want to update
     *   }
     * })
     */
    upsert<T extends UsageTrackingUpsertArgs>(args: SelectSubset<T, UsageTrackingUpsertArgs<ExtArgs>>): Prisma__UsageTrackingClient<$Result.GetResult<Prisma.$UsageTrackingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UsageTrackings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingCountArgs} args - Arguments to filter UsageTrackings to count.
     * @example
     * // Count the number of UsageTrackings
     * const count = await prisma.usageTracking.count({
     *   where: {
     *     // ... the filter for the UsageTrackings we want to count
     *   }
     * })
    **/
    count<T extends UsageTrackingCountArgs>(
      args?: Subset<T, UsageTrackingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsageTrackingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UsageTracking.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsageTrackingAggregateArgs>(args: Subset<T, UsageTrackingAggregateArgs>): Prisma.PrismaPromise<GetUsageTrackingAggregateType<T>>

    /**
     * Group by UsageTracking.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageTrackingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UsageTrackingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UsageTrackingGroupByArgs['orderBy'] }
        : { orderBy?: UsageTrackingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UsageTrackingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsageTrackingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UsageTracking model
   */
  readonly fields: UsageTrackingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UsageTracking.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UsageTrackingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    request<T extends AiRequestDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AiRequestDefaultArgs<ExtArgs>>): Prisma__AiRequestClient<$Result.GetResult<Prisma.$AiRequestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UsageTracking model
   */
  interface UsageTrackingFieldRefs {
    readonly id: FieldRef<"UsageTracking", 'String'>
    readonly request_id: FieldRef<"UsageTracking", 'String'>
    readonly model: FieldRef<"UsageTracking", 'String'>
    readonly prompt_tokens: FieldRef<"UsageTracking", 'Int'>
    readonly completion_tokens: FieldRef<"UsageTracking", 'Int'>
    readonly total_tokens: FieldRef<"UsageTracking", 'Int'>
    readonly cost_estimate: FieldRef<"UsageTracking", 'Decimal'>
    readonly created_at: FieldRef<"UsageTracking", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UsageTracking findUnique
   */
  export type UsageTrackingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter, which UsageTracking to fetch.
     */
    where: UsageTrackingWhereUniqueInput
  }

  /**
   * UsageTracking findUniqueOrThrow
   */
  export type UsageTrackingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter, which UsageTracking to fetch.
     */
    where: UsageTrackingWhereUniqueInput
  }

  /**
   * UsageTracking findFirst
   */
  export type UsageTrackingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter, which UsageTracking to fetch.
     */
    where?: UsageTrackingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageTrackings to fetch.
     */
    orderBy?: UsageTrackingOrderByWithRelationInput | UsageTrackingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UsageTrackings.
     */
    cursor?: UsageTrackingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageTrackings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageTrackings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UsageTrackings.
     */
    distinct?: UsageTrackingScalarFieldEnum | UsageTrackingScalarFieldEnum[]
  }

  /**
   * UsageTracking findFirstOrThrow
   */
  export type UsageTrackingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter, which UsageTracking to fetch.
     */
    where?: UsageTrackingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageTrackings to fetch.
     */
    orderBy?: UsageTrackingOrderByWithRelationInput | UsageTrackingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UsageTrackings.
     */
    cursor?: UsageTrackingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageTrackings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageTrackings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UsageTrackings.
     */
    distinct?: UsageTrackingScalarFieldEnum | UsageTrackingScalarFieldEnum[]
  }

  /**
   * UsageTracking findMany
   */
  export type UsageTrackingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter, which UsageTrackings to fetch.
     */
    where?: UsageTrackingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageTrackings to fetch.
     */
    orderBy?: UsageTrackingOrderByWithRelationInput | UsageTrackingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UsageTrackings.
     */
    cursor?: UsageTrackingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageTrackings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageTrackings.
     */
    skip?: number
    distinct?: UsageTrackingScalarFieldEnum | UsageTrackingScalarFieldEnum[]
  }

  /**
   * UsageTracking create
   */
  export type UsageTrackingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * The data needed to create a UsageTracking.
     */
    data: XOR<UsageTrackingCreateInput, UsageTrackingUncheckedCreateInput>
  }

  /**
   * UsageTracking createMany
   */
  export type UsageTrackingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UsageTrackings.
     */
    data: UsageTrackingCreateManyInput | UsageTrackingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UsageTracking createManyAndReturn
   */
  export type UsageTrackingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * The data used to create many UsageTrackings.
     */
    data: UsageTrackingCreateManyInput | UsageTrackingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UsageTracking update
   */
  export type UsageTrackingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * The data needed to update a UsageTracking.
     */
    data: XOR<UsageTrackingUpdateInput, UsageTrackingUncheckedUpdateInput>
    /**
     * Choose, which UsageTracking to update.
     */
    where: UsageTrackingWhereUniqueInput
  }

  /**
   * UsageTracking updateMany
   */
  export type UsageTrackingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UsageTrackings.
     */
    data: XOR<UsageTrackingUpdateManyMutationInput, UsageTrackingUncheckedUpdateManyInput>
    /**
     * Filter which UsageTrackings to update
     */
    where?: UsageTrackingWhereInput
    /**
     * Limit how many UsageTrackings to update.
     */
    limit?: number
  }

  /**
   * UsageTracking updateManyAndReturn
   */
  export type UsageTrackingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * The data used to update UsageTrackings.
     */
    data: XOR<UsageTrackingUpdateManyMutationInput, UsageTrackingUncheckedUpdateManyInput>
    /**
     * Filter which UsageTrackings to update
     */
    where?: UsageTrackingWhereInput
    /**
     * Limit how many UsageTrackings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UsageTracking upsert
   */
  export type UsageTrackingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * The filter to search for the UsageTracking to update in case it exists.
     */
    where: UsageTrackingWhereUniqueInput
    /**
     * In case the UsageTracking found by the `where` argument doesn't exist, create a new UsageTracking with this data.
     */
    create: XOR<UsageTrackingCreateInput, UsageTrackingUncheckedCreateInput>
    /**
     * In case the UsageTracking was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UsageTrackingUpdateInput, UsageTrackingUncheckedUpdateInput>
  }

  /**
   * UsageTracking delete
   */
  export type UsageTrackingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
    /**
     * Filter which UsageTracking to delete.
     */
    where: UsageTrackingWhereUniqueInput
  }

  /**
   * UsageTracking deleteMany
   */
  export type UsageTrackingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UsageTrackings to delete
     */
    where?: UsageTrackingWhereInput
    /**
     * Limit how many UsageTrackings to delete.
     */
    limit?: number
  }

  /**
   * UsageTracking without action
   */
  export type UsageTrackingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageTracking
     */
    select?: UsageTrackingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageTracking
     */
    omit?: UsageTrackingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageTrackingInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    github_id: 'github_id',
    github_username: 'github_username',
    name: 'name',
    avatar_url: 'avatar_url',
    bio: 'bio',
    company: 'company',
    location: 'location',
    timezone: 'timezone',
    locale: 'locale',
    first_login_at: 'first_login_at',
    last_login_at: 'last_login_at',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const UserSessionScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    session_id: 'session_id',
    access_token: 'access_token',
    refresh_token: 'refresh_token',
    expires_at: 'expires_at',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type UserSessionScalarFieldEnum = (typeof UserSessionScalarFieldEnum)[keyof typeof UserSessionScalarFieldEnum]


  export const ApiKeyScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    name: 'name',
    key_hash: 'key_hash',
    permissions: 'permissions',
    last_used_at: 'last_used_at',
    expires_at: 'expires_at',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type ApiKeyScalarFieldEnum = (typeof ApiKeyScalarFieldEnum)[keyof typeof ApiKeyScalarFieldEnum]


  export const ProjectScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    status: 'status',
    repository_id: 'repository_id',
    settings: 'settings',
    ai_model: 'ai_model',
    ai_budget: 'ai_budget',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type ProjectScalarFieldEnum = (typeof ProjectScalarFieldEnum)[keyof typeof ProjectScalarFieldEnum]


  export const ProjectMemberScalarFieldEnum: {
    id: 'id',
    project_id: 'project_id',
    user_id: 'user_id',
    role: 'role',
    joined_at: 'joined_at',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type ProjectMemberScalarFieldEnum = (typeof ProjectMemberScalarFieldEnum)[keyof typeof ProjectMemberScalarFieldEnum]


  export const RepositoryScalarFieldEnum: {
    id: 'id',
    github_id: 'github_id',
    full_name: 'full_name',
    name: 'name',
    owner: 'owner',
    description: 'description',
    clone_url: 'clone_url',
    ssh_url: 'ssh_url',
    default_branch: 'default_branch',
    is_private: 'is_private',
    webhook_id: 'webhook_id',
    webhook_secret: 'webhook_secret',
    last_sync_at: 'last_sync_at',
    sync_status: 'sync_status',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type RepositoryScalarFieldEnum = (typeof RepositoryScalarFieldEnum)[keyof typeof RepositoryScalarFieldEnum]


  export const DocumentScalarFieldEnum: {
    id: 'id',
    project_id: 'project_id',
    title: 'title',
    description: 'description',
    type: 'type',
    status: 'status',
    file_path: 'file_path',
    metadata: 'metadata',
    created_by: 'created_by',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type DocumentScalarFieldEnum = (typeof DocumentScalarFieldEnum)[keyof typeof DocumentScalarFieldEnum]


  export const DocumentVersionScalarFieldEnum: {
    id: 'id',
    document_id: 'document_id',
    version: 'version',
    content: 'content',
    diff_from_previous: 'diff_from_previous',
    commit_hash: 'commit_hash',
    created_by: 'created_by',
    created_at: 'created_at'
  };

  export type DocumentVersionScalarFieldEnum = (typeof DocumentVersionScalarFieldEnum)[keyof typeof DocumentVersionScalarFieldEnum]


  export const AiRequestScalarFieldEnum: {
    id: 'id',
    project_id: 'project_id',
    user_id: 'user_id',
    type: 'type',
    status: 'status',
    prompt: 'prompt',
    context: 'context',
    model: 'model',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type AiRequestScalarFieldEnum = (typeof AiRequestScalarFieldEnum)[keyof typeof AiRequestScalarFieldEnum]


  export const AiResponseScalarFieldEnum: {
    id: 'id',
    request_id: 'request_id',
    content: 'content',
    tokens_used: 'tokens_used',
    model: 'model',
    finish_reason: 'finish_reason',
    metadata: 'metadata',
    created_at: 'created_at'
  };

  export type AiResponseScalarFieldEnum = (typeof AiResponseScalarFieldEnum)[keyof typeof AiResponseScalarFieldEnum]


  export const UsageTrackingScalarFieldEnum: {
    id: 'id',
    request_id: 'request_id',
    model: 'model',
    prompt_tokens: 'prompt_tokens',
    completion_tokens: 'completion_tokens',
    total_tokens: 'total_tokens',
    cost_estimate: 'cost_estimate',
    created_at: 'created_at'
  };

  export type UsageTrackingScalarFieldEnum = (typeof UsageTrackingScalarFieldEnum)[keyof typeof UsageTrackingScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'ProjectStatus'
   */
  export type EnumProjectStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ProjectStatus'>
    


  /**
   * Reference to a field of type 'ProjectStatus[]'
   */
  export type ListEnumProjectStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ProjectStatus[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'MemberRole'
   */
  export type EnumMemberRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MemberRole'>
    


  /**
   * Reference to a field of type 'MemberRole[]'
   */
  export type ListEnumMemberRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MemberRole[]'>
    


  /**
   * Reference to a field of type 'DocumentType'
   */
  export type EnumDocumentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DocumentType'>
    


  /**
   * Reference to a field of type 'DocumentType[]'
   */
  export type ListEnumDocumentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DocumentType[]'>
    


  /**
   * Reference to a field of type 'DocumentStatus'
   */
  export type EnumDocumentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DocumentStatus'>
    


  /**
   * Reference to a field of type 'DocumentStatus[]'
   */
  export type ListEnumDocumentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DocumentStatus[]'>
    


  /**
   * Reference to a field of type 'AiRequestType'
   */
  export type EnumAiRequestTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiRequestType'>
    


  /**
   * Reference to a field of type 'AiRequestType[]'
   */
  export type ListEnumAiRequestTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiRequestType[]'>
    


  /**
   * Reference to a field of type 'AiRequestStatus'
   */
  export type EnumAiRequestStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiRequestStatus'>
    


  /**
   * Reference to a field of type 'AiRequestStatus[]'
   */
  export type ListEnumAiRequestStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AiRequestStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    email?: StringFilter<"User"> | string
    github_id?: IntFilter<"User"> | number
    github_username?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    avatar_url?: StringNullableFilter<"User"> | string | null
    bio?: StringNullableFilter<"User"> | string | null
    company?: StringNullableFilter<"User"> | string | null
    location?: StringNullableFilter<"User"> | string | null
    timezone?: StringFilter<"User"> | string
    locale?: StringFilter<"User"> | string
    first_login_at?: DateTimeNullableFilter<"User"> | Date | string | null
    last_login_at?: DateTimeNullableFilter<"User"> | Date | string | null
    is_active?: BoolFilter<"User"> | boolean
    created_at?: DateTimeFilter<"User"> | Date | string
    updated_at?: DateTimeFilter<"User"> | Date | string
    user_sessions?: UserSessionListRelationFilter
    api_keys?: ApiKeyListRelationFilter
    project_members?: ProjectMemberListRelationFilter
    documents?: DocumentListRelationFilter
    document_versions?: DocumentVersionListRelationFilter
    ai_requests?: AiRequestListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    github_id?: SortOrder
    github_username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    company?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    timezone?: SortOrder
    locale?: SortOrder
    first_login_at?: SortOrderInput | SortOrder
    last_login_at?: SortOrderInput | SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    user_sessions?: UserSessionOrderByRelationAggregateInput
    api_keys?: ApiKeyOrderByRelationAggregateInput
    project_members?: ProjectMemberOrderByRelationAggregateInput
    documents?: DocumentOrderByRelationAggregateInput
    document_versions?: DocumentVersionOrderByRelationAggregateInput
    ai_requests?: AiRequestOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    github_id?: number
    github_username?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    avatar_url?: StringNullableFilter<"User"> | string | null
    bio?: StringNullableFilter<"User"> | string | null
    company?: StringNullableFilter<"User"> | string | null
    location?: StringNullableFilter<"User"> | string | null
    timezone?: StringFilter<"User"> | string
    locale?: StringFilter<"User"> | string
    first_login_at?: DateTimeNullableFilter<"User"> | Date | string | null
    last_login_at?: DateTimeNullableFilter<"User"> | Date | string | null
    is_active?: BoolFilter<"User"> | boolean
    created_at?: DateTimeFilter<"User"> | Date | string
    updated_at?: DateTimeFilter<"User"> | Date | string
    user_sessions?: UserSessionListRelationFilter
    api_keys?: ApiKeyListRelationFilter
    project_members?: ProjectMemberListRelationFilter
    documents?: DocumentListRelationFilter
    document_versions?: DocumentVersionListRelationFilter
    ai_requests?: AiRequestListRelationFilter
  }, "id" | "email" | "github_id" | "github_username">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    github_id?: SortOrder
    github_username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    company?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    timezone?: SortOrder
    locale?: SortOrder
    first_login_at?: SortOrderInput | SortOrder
    last_login_at?: SortOrderInput | SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    github_id?: IntWithAggregatesFilter<"User"> | number
    github_username?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    avatar_url?: StringNullableWithAggregatesFilter<"User"> | string | null
    bio?: StringNullableWithAggregatesFilter<"User"> | string | null
    company?: StringNullableWithAggregatesFilter<"User"> | string | null
    location?: StringNullableWithAggregatesFilter<"User"> | string | null
    timezone?: StringWithAggregatesFilter<"User"> | string
    locale?: StringWithAggregatesFilter<"User"> | string
    first_login_at?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    last_login_at?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    is_active?: BoolWithAggregatesFilter<"User"> | boolean
    created_at?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type UserSessionWhereInput = {
    AND?: UserSessionWhereInput | UserSessionWhereInput[]
    OR?: UserSessionWhereInput[]
    NOT?: UserSessionWhereInput | UserSessionWhereInput[]
    id?: UuidFilter<"UserSession"> | string
    user_id?: UuidFilter<"UserSession"> | string
    session_id?: StringFilter<"UserSession"> | string
    access_token?: StringFilter<"UserSession"> | string
    refresh_token?: StringNullableFilter<"UserSession"> | string | null
    expires_at?: DateTimeFilter<"UserSession"> | Date | string
    ip_address?: StringNullableFilter<"UserSession"> | string | null
    user_agent?: StringNullableFilter<"UserSession"> | string | null
    created_at?: DateTimeFilter<"UserSession"> | Date | string
    updated_at?: DateTimeFilter<"UserSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserSessionOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    session_id?: SortOrder
    access_token?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    expires_at?: SortOrder
    ip_address?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    session_id?: string
    AND?: UserSessionWhereInput | UserSessionWhereInput[]
    OR?: UserSessionWhereInput[]
    NOT?: UserSessionWhereInput | UserSessionWhereInput[]
    user_id?: UuidFilter<"UserSession"> | string
    access_token?: StringFilter<"UserSession"> | string
    refresh_token?: StringNullableFilter<"UserSession"> | string | null
    expires_at?: DateTimeFilter<"UserSession"> | Date | string
    ip_address?: StringNullableFilter<"UserSession"> | string | null
    user_agent?: StringNullableFilter<"UserSession"> | string | null
    created_at?: DateTimeFilter<"UserSession"> | Date | string
    updated_at?: DateTimeFilter<"UserSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "session_id">

  export type UserSessionOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    session_id?: SortOrder
    access_token?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    expires_at?: SortOrder
    ip_address?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: UserSessionCountOrderByAggregateInput
    _max?: UserSessionMaxOrderByAggregateInput
    _min?: UserSessionMinOrderByAggregateInput
  }

  export type UserSessionScalarWhereWithAggregatesInput = {
    AND?: UserSessionScalarWhereWithAggregatesInput | UserSessionScalarWhereWithAggregatesInput[]
    OR?: UserSessionScalarWhereWithAggregatesInput[]
    NOT?: UserSessionScalarWhereWithAggregatesInput | UserSessionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"UserSession"> | string
    user_id?: UuidWithAggregatesFilter<"UserSession"> | string
    session_id?: StringWithAggregatesFilter<"UserSession"> | string
    access_token?: StringWithAggregatesFilter<"UserSession"> | string
    refresh_token?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    expires_at?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
    ip_address?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    user_agent?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
  }

  export type ApiKeyWhereInput = {
    AND?: ApiKeyWhereInput | ApiKeyWhereInput[]
    OR?: ApiKeyWhereInput[]
    NOT?: ApiKeyWhereInput | ApiKeyWhereInput[]
    id?: UuidFilter<"ApiKey"> | string
    user_id?: UuidFilter<"ApiKey"> | string
    name?: StringFilter<"ApiKey"> | string
    key_hash?: StringFilter<"ApiKey"> | string
    permissions?: JsonFilter<"ApiKey">
    last_used_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    expires_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    is_active?: BoolFilter<"ApiKey"> | boolean
    created_at?: DateTimeFilter<"ApiKey"> | Date | string
    updated_at?: DateTimeFilter<"ApiKey"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ApiKeyOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    key_hash?: SortOrder
    permissions?: SortOrder
    last_used_at?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type ApiKeyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    key_hash?: string
    AND?: ApiKeyWhereInput | ApiKeyWhereInput[]
    OR?: ApiKeyWhereInput[]
    NOT?: ApiKeyWhereInput | ApiKeyWhereInput[]
    user_id?: UuidFilter<"ApiKey"> | string
    name?: StringFilter<"ApiKey"> | string
    permissions?: JsonFilter<"ApiKey">
    last_used_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    expires_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    is_active?: BoolFilter<"ApiKey"> | boolean
    created_at?: DateTimeFilter<"ApiKey"> | Date | string
    updated_at?: DateTimeFilter<"ApiKey"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "key_hash">

  export type ApiKeyOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    key_hash?: SortOrder
    permissions?: SortOrder
    last_used_at?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: ApiKeyCountOrderByAggregateInput
    _max?: ApiKeyMaxOrderByAggregateInput
    _min?: ApiKeyMinOrderByAggregateInput
  }

  export type ApiKeyScalarWhereWithAggregatesInput = {
    AND?: ApiKeyScalarWhereWithAggregatesInput | ApiKeyScalarWhereWithAggregatesInput[]
    OR?: ApiKeyScalarWhereWithAggregatesInput[]
    NOT?: ApiKeyScalarWhereWithAggregatesInput | ApiKeyScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ApiKey"> | string
    user_id?: UuidWithAggregatesFilter<"ApiKey"> | string
    name?: StringWithAggregatesFilter<"ApiKey"> | string
    key_hash?: StringWithAggregatesFilter<"ApiKey"> | string
    permissions?: JsonWithAggregatesFilter<"ApiKey">
    last_used_at?: DateTimeNullableWithAggregatesFilter<"ApiKey"> | Date | string | null
    expires_at?: DateTimeNullableWithAggregatesFilter<"ApiKey"> | Date | string | null
    is_active?: BoolWithAggregatesFilter<"ApiKey"> | boolean
    created_at?: DateTimeWithAggregatesFilter<"ApiKey"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"ApiKey"> | Date | string
  }

  export type ProjectWhereInput = {
    AND?: ProjectWhereInput | ProjectWhereInput[]
    OR?: ProjectWhereInput[]
    NOT?: ProjectWhereInput | ProjectWhereInput[]
    id?: UuidFilter<"Project"> | string
    name?: StringFilter<"Project"> | string
    description?: StringNullableFilter<"Project"> | string | null
    status?: EnumProjectStatusFilter<"Project"> | $Enums.ProjectStatus
    repository_id?: UuidNullableFilter<"Project"> | string | null
    settings?: JsonFilter<"Project">
    ai_model?: StringFilter<"Project"> | string
    ai_budget?: DecimalNullableFilter<"Project"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFilter<"Project"> | Date | string
    updated_at?: DateTimeFilter<"Project"> | Date | string
    repository?: XOR<RepositoryNullableScalarRelationFilter, RepositoryWhereInput> | null
    project_members?: ProjectMemberListRelationFilter
    documents?: DocumentListRelationFilter
    ai_requests?: AiRequestListRelationFilter
  }

  export type ProjectOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrder
    repository_id?: SortOrderInput | SortOrder
    settings?: SortOrder
    ai_model?: SortOrder
    ai_budget?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    repository?: RepositoryOrderByWithRelationInput
    project_members?: ProjectMemberOrderByRelationAggregateInput
    documents?: DocumentOrderByRelationAggregateInput
    ai_requests?: AiRequestOrderByRelationAggregateInput
  }

  export type ProjectWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    repository_id?: string
    AND?: ProjectWhereInput | ProjectWhereInput[]
    OR?: ProjectWhereInput[]
    NOT?: ProjectWhereInput | ProjectWhereInput[]
    name?: StringFilter<"Project"> | string
    description?: StringNullableFilter<"Project"> | string | null
    status?: EnumProjectStatusFilter<"Project"> | $Enums.ProjectStatus
    settings?: JsonFilter<"Project">
    ai_model?: StringFilter<"Project"> | string
    ai_budget?: DecimalNullableFilter<"Project"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFilter<"Project"> | Date | string
    updated_at?: DateTimeFilter<"Project"> | Date | string
    repository?: XOR<RepositoryNullableScalarRelationFilter, RepositoryWhereInput> | null
    project_members?: ProjectMemberListRelationFilter
    documents?: DocumentListRelationFilter
    ai_requests?: AiRequestListRelationFilter
  }, "id" | "repository_id">

  export type ProjectOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    status?: SortOrder
    repository_id?: SortOrderInput | SortOrder
    settings?: SortOrder
    ai_model?: SortOrder
    ai_budget?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: ProjectCountOrderByAggregateInput
    _avg?: ProjectAvgOrderByAggregateInput
    _max?: ProjectMaxOrderByAggregateInput
    _min?: ProjectMinOrderByAggregateInput
    _sum?: ProjectSumOrderByAggregateInput
  }

  export type ProjectScalarWhereWithAggregatesInput = {
    AND?: ProjectScalarWhereWithAggregatesInput | ProjectScalarWhereWithAggregatesInput[]
    OR?: ProjectScalarWhereWithAggregatesInput[]
    NOT?: ProjectScalarWhereWithAggregatesInput | ProjectScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Project"> | string
    name?: StringWithAggregatesFilter<"Project"> | string
    description?: StringNullableWithAggregatesFilter<"Project"> | string | null
    status?: EnumProjectStatusWithAggregatesFilter<"Project"> | $Enums.ProjectStatus
    repository_id?: UuidNullableWithAggregatesFilter<"Project"> | string | null
    settings?: JsonWithAggregatesFilter<"Project">
    ai_model?: StringWithAggregatesFilter<"Project"> | string
    ai_budget?: DecimalNullableWithAggregatesFilter<"Project"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeWithAggregatesFilter<"Project"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Project"> | Date | string
  }

  export type ProjectMemberWhereInput = {
    AND?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    OR?: ProjectMemberWhereInput[]
    NOT?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    id?: UuidFilter<"ProjectMember"> | string
    project_id?: UuidFilter<"ProjectMember"> | string
    user_id?: UuidFilter<"ProjectMember"> | string
    role?: EnumMemberRoleFilter<"ProjectMember"> | $Enums.MemberRole
    joined_at?: DateTimeFilter<"ProjectMember"> | Date | string
    created_at?: DateTimeFilter<"ProjectMember"> | Date | string
    updated_at?: DateTimeFilter<"ProjectMember"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ProjectMemberOrderByWithRelationInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    joined_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    project?: ProjectOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type ProjectMemberWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    project_id_user_id?: ProjectMemberProject_idUser_idCompoundUniqueInput
    AND?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    OR?: ProjectMemberWhereInput[]
    NOT?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    project_id?: UuidFilter<"ProjectMember"> | string
    user_id?: UuidFilter<"ProjectMember"> | string
    role?: EnumMemberRoleFilter<"ProjectMember"> | $Enums.MemberRole
    joined_at?: DateTimeFilter<"ProjectMember"> | Date | string
    created_at?: DateTimeFilter<"ProjectMember"> | Date | string
    updated_at?: DateTimeFilter<"ProjectMember"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "project_id_user_id">

  export type ProjectMemberOrderByWithAggregationInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    joined_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: ProjectMemberCountOrderByAggregateInput
    _max?: ProjectMemberMaxOrderByAggregateInput
    _min?: ProjectMemberMinOrderByAggregateInput
  }

  export type ProjectMemberScalarWhereWithAggregatesInput = {
    AND?: ProjectMemberScalarWhereWithAggregatesInput | ProjectMemberScalarWhereWithAggregatesInput[]
    OR?: ProjectMemberScalarWhereWithAggregatesInput[]
    NOT?: ProjectMemberScalarWhereWithAggregatesInput | ProjectMemberScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ProjectMember"> | string
    project_id?: UuidWithAggregatesFilter<"ProjectMember"> | string
    user_id?: UuidWithAggregatesFilter<"ProjectMember"> | string
    role?: EnumMemberRoleWithAggregatesFilter<"ProjectMember"> | $Enums.MemberRole
    joined_at?: DateTimeWithAggregatesFilter<"ProjectMember"> | Date | string
    created_at?: DateTimeWithAggregatesFilter<"ProjectMember"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"ProjectMember"> | Date | string
  }

  export type RepositoryWhereInput = {
    AND?: RepositoryWhereInput | RepositoryWhereInput[]
    OR?: RepositoryWhereInput[]
    NOT?: RepositoryWhereInput | RepositoryWhereInput[]
    id?: UuidFilter<"Repository"> | string
    github_id?: IntFilter<"Repository"> | number
    full_name?: StringFilter<"Repository"> | string
    name?: StringFilter<"Repository"> | string
    owner?: StringFilter<"Repository"> | string
    description?: StringNullableFilter<"Repository"> | string | null
    clone_url?: StringFilter<"Repository"> | string
    ssh_url?: StringFilter<"Repository"> | string
    default_branch?: StringFilter<"Repository"> | string
    is_private?: BoolFilter<"Repository"> | boolean
    webhook_id?: IntNullableFilter<"Repository"> | number | null
    webhook_secret?: StringNullableFilter<"Repository"> | string | null
    last_sync_at?: DateTimeNullableFilter<"Repository"> | Date | string | null
    sync_status?: StringNullableFilter<"Repository"> | string | null
    created_at?: DateTimeFilter<"Repository"> | Date | string
    updated_at?: DateTimeFilter<"Repository"> | Date | string
    project?: XOR<ProjectNullableScalarRelationFilter, ProjectWhereInput> | null
  }

  export type RepositoryOrderByWithRelationInput = {
    id?: SortOrder
    github_id?: SortOrder
    full_name?: SortOrder
    name?: SortOrder
    owner?: SortOrder
    description?: SortOrderInput | SortOrder
    clone_url?: SortOrder
    ssh_url?: SortOrder
    default_branch?: SortOrder
    is_private?: SortOrder
    webhook_id?: SortOrderInput | SortOrder
    webhook_secret?: SortOrderInput | SortOrder
    last_sync_at?: SortOrderInput | SortOrder
    sync_status?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    project?: ProjectOrderByWithRelationInput
  }

  export type RepositoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    github_id?: number
    full_name?: string
    AND?: RepositoryWhereInput | RepositoryWhereInput[]
    OR?: RepositoryWhereInput[]
    NOT?: RepositoryWhereInput | RepositoryWhereInput[]
    name?: StringFilter<"Repository"> | string
    owner?: StringFilter<"Repository"> | string
    description?: StringNullableFilter<"Repository"> | string | null
    clone_url?: StringFilter<"Repository"> | string
    ssh_url?: StringFilter<"Repository"> | string
    default_branch?: StringFilter<"Repository"> | string
    is_private?: BoolFilter<"Repository"> | boolean
    webhook_id?: IntNullableFilter<"Repository"> | number | null
    webhook_secret?: StringNullableFilter<"Repository"> | string | null
    last_sync_at?: DateTimeNullableFilter<"Repository"> | Date | string | null
    sync_status?: StringNullableFilter<"Repository"> | string | null
    created_at?: DateTimeFilter<"Repository"> | Date | string
    updated_at?: DateTimeFilter<"Repository"> | Date | string
    project?: XOR<ProjectNullableScalarRelationFilter, ProjectWhereInput> | null
  }, "id" | "github_id" | "full_name">

  export type RepositoryOrderByWithAggregationInput = {
    id?: SortOrder
    github_id?: SortOrder
    full_name?: SortOrder
    name?: SortOrder
    owner?: SortOrder
    description?: SortOrderInput | SortOrder
    clone_url?: SortOrder
    ssh_url?: SortOrder
    default_branch?: SortOrder
    is_private?: SortOrder
    webhook_id?: SortOrderInput | SortOrder
    webhook_secret?: SortOrderInput | SortOrder
    last_sync_at?: SortOrderInput | SortOrder
    sync_status?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: RepositoryCountOrderByAggregateInput
    _avg?: RepositoryAvgOrderByAggregateInput
    _max?: RepositoryMaxOrderByAggregateInput
    _min?: RepositoryMinOrderByAggregateInput
    _sum?: RepositorySumOrderByAggregateInput
  }

  export type RepositoryScalarWhereWithAggregatesInput = {
    AND?: RepositoryScalarWhereWithAggregatesInput | RepositoryScalarWhereWithAggregatesInput[]
    OR?: RepositoryScalarWhereWithAggregatesInput[]
    NOT?: RepositoryScalarWhereWithAggregatesInput | RepositoryScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Repository"> | string
    github_id?: IntWithAggregatesFilter<"Repository"> | number
    full_name?: StringWithAggregatesFilter<"Repository"> | string
    name?: StringWithAggregatesFilter<"Repository"> | string
    owner?: StringWithAggregatesFilter<"Repository"> | string
    description?: StringNullableWithAggregatesFilter<"Repository"> | string | null
    clone_url?: StringWithAggregatesFilter<"Repository"> | string
    ssh_url?: StringWithAggregatesFilter<"Repository"> | string
    default_branch?: StringWithAggregatesFilter<"Repository"> | string
    is_private?: BoolWithAggregatesFilter<"Repository"> | boolean
    webhook_id?: IntNullableWithAggregatesFilter<"Repository"> | number | null
    webhook_secret?: StringNullableWithAggregatesFilter<"Repository"> | string | null
    last_sync_at?: DateTimeNullableWithAggregatesFilter<"Repository"> | Date | string | null
    sync_status?: StringNullableWithAggregatesFilter<"Repository"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"Repository"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Repository"> | Date | string
  }

  export type DocumentWhereInput = {
    AND?: DocumentWhereInput | DocumentWhereInput[]
    OR?: DocumentWhereInput[]
    NOT?: DocumentWhereInput | DocumentWhereInput[]
    id?: UuidFilter<"Document"> | string
    project_id?: UuidFilter<"Document"> | string
    title?: StringFilter<"Document"> | string
    description?: StringNullableFilter<"Document"> | string | null
    type?: EnumDocumentTypeFilter<"Document"> | $Enums.DocumentType
    status?: EnumDocumentStatusFilter<"Document"> | $Enums.DocumentStatus
    file_path?: StringNullableFilter<"Document"> | string | null
    metadata?: JsonFilter<"Document">
    created_by?: UuidFilter<"Document"> | string
    created_at?: DateTimeFilter<"Document"> | Date | string
    updated_at?: DateTimeFilter<"Document"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    versions?: DocumentVersionListRelationFilter
  }

  export type DocumentOrderByWithRelationInput = {
    id?: SortOrder
    project_id?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    file_path?: SortOrderInput | SortOrder
    metadata?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    project?: ProjectOrderByWithRelationInput
    creator?: UserOrderByWithRelationInput
    versions?: DocumentVersionOrderByRelationAggregateInput
  }

  export type DocumentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: DocumentWhereInput | DocumentWhereInput[]
    OR?: DocumentWhereInput[]
    NOT?: DocumentWhereInput | DocumentWhereInput[]
    project_id?: UuidFilter<"Document"> | string
    title?: StringFilter<"Document"> | string
    description?: StringNullableFilter<"Document"> | string | null
    type?: EnumDocumentTypeFilter<"Document"> | $Enums.DocumentType
    status?: EnumDocumentStatusFilter<"Document"> | $Enums.DocumentStatus
    file_path?: StringNullableFilter<"Document"> | string | null
    metadata?: JsonFilter<"Document">
    created_by?: UuidFilter<"Document"> | string
    created_at?: DateTimeFilter<"Document"> | Date | string
    updated_at?: DateTimeFilter<"Document"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
    versions?: DocumentVersionListRelationFilter
  }, "id">

  export type DocumentOrderByWithAggregationInput = {
    id?: SortOrder
    project_id?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    file_path?: SortOrderInput | SortOrder
    metadata?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: DocumentCountOrderByAggregateInput
    _max?: DocumentMaxOrderByAggregateInput
    _min?: DocumentMinOrderByAggregateInput
  }

  export type DocumentScalarWhereWithAggregatesInput = {
    AND?: DocumentScalarWhereWithAggregatesInput | DocumentScalarWhereWithAggregatesInput[]
    OR?: DocumentScalarWhereWithAggregatesInput[]
    NOT?: DocumentScalarWhereWithAggregatesInput | DocumentScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Document"> | string
    project_id?: UuidWithAggregatesFilter<"Document"> | string
    title?: StringWithAggregatesFilter<"Document"> | string
    description?: StringNullableWithAggregatesFilter<"Document"> | string | null
    type?: EnumDocumentTypeWithAggregatesFilter<"Document"> | $Enums.DocumentType
    status?: EnumDocumentStatusWithAggregatesFilter<"Document"> | $Enums.DocumentStatus
    file_path?: StringNullableWithAggregatesFilter<"Document"> | string | null
    metadata?: JsonWithAggregatesFilter<"Document">
    created_by?: UuidWithAggregatesFilter<"Document"> | string
    created_at?: DateTimeWithAggregatesFilter<"Document"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Document"> | Date | string
  }

  export type DocumentVersionWhereInput = {
    AND?: DocumentVersionWhereInput | DocumentVersionWhereInput[]
    OR?: DocumentVersionWhereInput[]
    NOT?: DocumentVersionWhereInput | DocumentVersionWhereInput[]
    id?: UuidFilter<"DocumentVersion"> | string
    document_id?: UuidFilter<"DocumentVersion"> | string
    version?: IntFilter<"DocumentVersion"> | number
    content?: StringFilter<"DocumentVersion"> | string
    diff_from_previous?: StringNullableFilter<"DocumentVersion"> | string | null
    commit_hash?: StringNullableFilter<"DocumentVersion"> | string | null
    created_by?: UuidFilter<"DocumentVersion"> | string
    created_at?: DateTimeFilter<"DocumentVersion"> | Date | string
    document?: XOR<DocumentScalarRelationFilter, DocumentWhereInput>
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type DocumentVersionOrderByWithRelationInput = {
    id?: SortOrder
    document_id?: SortOrder
    version?: SortOrder
    content?: SortOrder
    diff_from_previous?: SortOrderInput | SortOrder
    commit_hash?: SortOrderInput | SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    document?: DocumentOrderByWithRelationInput
    creator?: UserOrderByWithRelationInput
  }

  export type DocumentVersionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    document_id_version?: DocumentVersionDocument_idVersionCompoundUniqueInput
    AND?: DocumentVersionWhereInput | DocumentVersionWhereInput[]
    OR?: DocumentVersionWhereInput[]
    NOT?: DocumentVersionWhereInput | DocumentVersionWhereInput[]
    document_id?: UuidFilter<"DocumentVersion"> | string
    version?: IntFilter<"DocumentVersion"> | number
    content?: StringFilter<"DocumentVersion"> | string
    diff_from_previous?: StringNullableFilter<"DocumentVersion"> | string | null
    commit_hash?: StringNullableFilter<"DocumentVersion"> | string | null
    created_by?: UuidFilter<"DocumentVersion"> | string
    created_at?: DateTimeFilter<"DocumentVersion"> | Date | string
    document?: XOR<DocumentScalarRelationFilter, DocumentWhereInput>
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "document_id_version">

  export type DocumentVersionOrderByWithAggregationInput = {
    id?: SortOrder
    document_id?: SortOrder
    version?: SortOrder
    content?: SortOrder
    diff_from_previous?: SortOrderInput | SortOrder
    commit_hash?: SortOrderInput | SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    _count?: DocumentVersionCountOrderByAggregateInput
    _avg?: DocumentVersionAvgOrderByAggregateInput
    _max?: DocumentVersionMaxOrderByAggregateInput
    _min?: DocumentVersionMinOrderByAggregateInput
    _sum?: DocumentVersionSumOrderByAggregateInput
  }

  export type DocumentVersionScalarWhereWithAggregatesInput = {
    AND?: DocumentVersionScalarWhereWithAggregatesInput | DocumentVersionScalarWhereWithAggregatesInput[]
    OR?: DocumentVersionScalarWhereWithAggregatesInput[]
    NOT?: DocumentVersionScalarWhereWithAggregatesInput | DocumentVersionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"DocumentVersion"> | string
    document_id?: UuidWithAggregatesFilter<"DocumentVersion"> | string
    version?: IntWithAggregatesFilter<"DocumentVersion"> | number
    content?: StringWithAggregatesFilter<"DocumentVersion"> | string
    diff_from_previous?: StringNullableWithAggregatesFilter<"DocumentVersion"> | string | null
    commit_hash?: StringNullableWithAggregatesFilter<"DocumentVersion"> | string | null
    created_by?: UuidWithAggregatesFilter<"DocumentVersion"> | string
    created_at?: DateTimeWithAggregatesFilter<"DocumentVersion"> | Date | string
  }

  export type AiRequestWhereInput = {
    AND?: AiRequestWhereInput | AiRequestWhereInput[]
    OR?: AiRequestWhereInput[]
    NOT?: AiRequestWhereInput | AiRequestWhereInput[]
    id?: UuidFilter<"AiRequest"> | string
    project_id?: UuidNullableFilter<"AiRequest"> | string | null
    user_id?: UuidFilter<"AiRequest"> | string
    type?: EnumAiRequestTypeFilter<"AiRequest"> | $Enums.AiRequestType
    status?: EnumAiRequestStatusFilter<"AiRequest"> | $Enums.AiRequestStatus
    prompt?: StringFilter<"AiRequest"> | string
    context?: JsonFilter<"AiRequest">
    model?: StringFilter<"AiRequest"> | string
    created_at?: DateTimeFilter<"AiRequest"> | Date | string
    updated_at?: DateTimeFilter<"AiRequest"> | Date | string
    project?: XOR<ProjectNullableScalarRelationFilter, ProjectWhereInput> | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    responses?: AiResponseListRelationFilter
    usage?: UsageTrackingListRelationFilter
  }

  export type AiRequestOrderByWithRelationInput = {
    id?: SortOrder
    project_id?: SortOrderInput | SortOrder
    user_id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    prompt?: SortOrder
    context?: SortOrder
    model?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    project?: ProjectOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
    responses?: AiResponseOrderByRelationAggregateInput
    usage?: UsageTrackingOrderByRelationAggregateInput
  }

  export type AiRequestWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AiRequestWhereInput | AiRequestWhereInput[]
    OR?: AiRequestWhereInput[]
    NOT?: AiRequestWhereInput | AiRequestWhereInput[]
    project_id?: UuidNullableFilter<"AiRequest"> | string | null
    user_id?: UuidFilter<"AiRequest"> | string
    type?: EnumAiRequestTypeFilter<"AiRequest"> | $Enums.AiRequestType
    status?: EnumAiRequestStatusFilter<"AiRequest"> | $Enums.AiRequestStatus
    prompt?: StringFilter<"AiRequest"> | string
    context?: JsonFilter<"AiRequest">
    model?: StringFilter<"AiRequest"> | string
    created_at?: DateTimeFilter<"AiRequest"> | Date | string
    updated_at?: DateTimeFilter<"AiRequest"> | Date | string
    project?: XOR<ProjectNullableScalarRelationFilter, ProjectWhereInput> | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    responses?: AiResponseListRelationFilter
    usage?: UsageTrackingListRelationFilter
  }, "id">

  export type AiRequestOrderByWithAggregationInput = {
    id?: SortOrder
    project_id?: SortOrderInput | SortOrder
    user_id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    prompt?: SortOrder
    context?: SortOrder
    model?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: AiRequestCountOrderByAggregateInput
    _max?: AiRequestMaxOrderByAggregateInput
    _min?: AiRequestMinOrderByAggregateInput
  }

  export type AiRequestScalarWhereWithAggregatesInput = {
    AND?: AiRequestScalarWhereWithAggregatesInput | AiRequestScalarWhereWithAggregatesInput[]
    OR?: AiRequestScalarWhereWithAggregatesInput[]
    NOT?: AiRequestScalarWhereWithAggregatesInput | AiRequestScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AiRequest"> | string
    project_id?: UuidNullableWithAggregatesFilter<"AiRequest"> | string | null
    user_id?: UuidWithAggregatesFilter<"AiRequest"> | string
    type?: EnumAiRequestTypeWithAggregatesFilter<"AiRequest"> | $Enums.AiRequestType
    status?: EnumAiRequestStatusWithAggregatesFilter<"AiRequest"> | $Enums.AiRequestStatus
    prompt?: StringWithAggregatesFilter<"AiRequest"> | string
    context?: JsonWithAggregatesFilter<"AiRequest">
    model?: StringWithAggregatesFilter<"AiRequest"> | string
    created_at?: DateTimeWithAggregatesFilter<"AiRequest"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"AiRequest"> | Date | string
  }

  export type AiResponseWhereInput = {
    AND?: AiResponseWhereInput | AiResponseWhereInput[]
    OR?: AiResponseWhereInput[]
    NOT?: AiResponseWhereInput | AiResponseWhereInput[]
    id?: UuidFilter<"AiResponse"> | string
    request_id?: UuidFilter<"AiResponse"> | string
    content?: StringFilter<"AiResponse"> | string
    tokens_used?: IntFilter<"AiResponse"> | number
    model?: StringFilter<"AiResponse"> | string
    finish_reason?: StringNullableFilter<"AiResponse"> | string | null
    metadata?: JsonFilter<"AiResponse">
    created_at?: DateTimeFilter<"AiResponse"> | Date | string
    request?: XOR<AiRequestScalarRelationFilter, AiRequestWhereInput>
  }

  export type AiResponseOrderByWithRelationInput = {
    id?: SortOrder
    request_id?: SortOrder
    content?: SortOrder
    tokens_used?: SortOrder
    model?: SortOrder
    finish_reason?: SortOrderInput | SortOrder
    metadata?: SortOrder
    created_at?: SortOrder
    request?: AiRequestOrderByWithRelationInput
  }

  export type AiResponseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AiResponseWhereInput | AiResponseWhereInput[]
    OR?: AiResponseWhereInput[]
    NOT?: AiResponseWhereInput | AiResponseWhereInput[]
    request_id?: UuidFilter<"AiResponse"> | string
    content?: StringFilter<"AiResponse"> | string
    tokens_used?: IntFilter<"AiResponse"> | number
    model?: StringFilter<"AiResponse"> | string
    finish_reason?: StringNullableFilter<"AiResponse"> | string | null
    metadata?: JsonFilter<"AiResponse">
    created_at?: DateTimeFilter<"AiResponse"> | Date | string
    request?: XOR<AiRequestScalarRelationFilter, AiRequestWhereInput>
  }, "id">

  export type AiResponseOrderByWithAggregationInput = {
    id?: SortOrder
    request_id?: SortOrder
    content?: SortOrder
    tokens_used?: SortOrder
    model?: SortOrder
    finish_reason?: SortOrderInput | SortOrder
    metadata?: SortOrder
    created_at?: SortOrder
    _count?: AiResponseCountOrderByAggregateInput
    _avg?: AiResponseAvgOrderByAggregateInput
    _max?: AiResponseMaxOrderByAggregateInput
    _min?: AiResponseMinOrderByAggregateInput
    _sum?: AiResponseSumOrderByAggregateInput
  }

  export type AiResponseScalarWhereWithAggregatesInput = {
    AND?: AiResponseScalarWhereWithAggregatesInput | AiResponseScalarWhereWithAggregatesInput[]
    OR?: AiResponseScalarWhereWithAggregatesInput[]
    NOT?: AiResponseScalarWhereWithAggregatesInput | AiResponseScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AiResponse"> | string
    request_id?: UuidWithAggregatesFilter<"AiResponse"> | string
    content?: StringWithAggregatesFilter<"AiResponse"> | string
    tokens_used?: IntWithAggregatesFilter<"AiResponse"> | number
    model?: StringWithAggregatesFilter<"AiResponse"> | string
    finish_reason?: StringNullableWithAggregatesFilter<"AiResponse"> | string | null
    metadata?: JsonWithAggregatesFilter<"AiResponse">
    created_at?: DateTimeWithAggregatesFilter<"AiResponse"> | Date | string
  }

  export type UsageTrackingWhereInput = {
    AND?: UsageTrackingWhereInput | UsageTrackingWhereInput[]
    OR?: UsageTrackingWhereInput[]
    NOT?: UsageTrackingWhereInput | UsageTrackingWhereInput[]
    id?: UuidFilter<"UsageTracking"> | string
    request_id?: UuidFilter<"UsageTracking"> | string
    model?: StringFilter<"UsageTracking"> | string
    prompt_tokens?: IntFilter<"UsageTracking"> | number
    completion_tokens?: IntFilter<"UsageTracking"> | number
    total_tokens?: IntFilter<"UsageTracking"> | number
    cost_estimate?: DecimalNullableFilter<"UsageTracking"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFilter<"UsageTracking"> | Date | string
    request?: XOR<AiRequestScalarRelationFilter, AiRequestWhereInput>
  }

  export type UsageTrackingOrderByWithRelationInput = {
    id?: SortOrder
    request_id?: SortOrder
    model?: SortOrder
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrderInput | SortOrder
    created_at?: SortOrder
    request?: AiRequestOrderByWithRelationInput
  }

  export type UsageTrackingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: UsageTrackingWhereInput | UsageTrackingWhereInput[]
    OR?: UsageTrackingWhereInput[]
    NOT?: UsageTrackingWhereInput | UsageTrackingWhereInput[]
    request_id?: UuidFilter<"UsageTracking"> | string
    model?: StringFilter<"UsageTracking"> | string
    prompt_tokens?: IntFilter<"UsageTracking"> | number
    completion_tokens?: IntFilter<"UsageTracking"> | number
    total_tokens?: IntFilter<"UsageTracking"> | number
    cost_estimate?: DecimalNullableFilter<"UsageTracking"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFilter<"UsageTracking"> | Date | string
    request?: XOR<AiRequestScalarRelationFilter, AiRequestWhereInput>
  }, "id">

  export type UsageTrackingOrderByWithAggregationInput = {
    id?: SortOrder
    request_id?: SortOrder
    model?: SortOrder
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: UsageTrackingCountOrderByAggregateInput
    _avg?: UsageTrackingAvgOrderByAggregateInput
    _max?: UsageTrackingMaxOrderByAggregateInput
    _min?: UsageTrackingMinOrderByAggregateInput
    _sum?: UsageTrackingSumOrderByAggregateInput
  }

  export type UsageTrackingScalarWhereWithAggregatesInput = {
    AND?: UsageTrackingScalarWhereWithAggregatesInput | UsageTrackingScalarWhereWithAggregatesInput[]
    OR?: UsageTrackingScalarWhereWithAggregatesInput[]
    NOT?: UsageTrackingScalarWhereWithAggregatesInput | UsageTrackingScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"UsageTracking"> | string
    request_id?: UuidWithAggregatesFilter<"UsageTracking"> | string
    model?: StringWithAggregatesFilter<"UsageTracking"> | string
    prompt_tokens?: IntWithAggregatesFilter<"UsageTracking"> | number
    completion_tokens?: IntWithAggregatesFilter<"UsageTracking"> | number
    total_tokens?: IntWithAggregatesFilter<"UsageTracking"> | number
    cost_estimate?: DecimalNullableWithAggregatesFilter<"UsageTracking"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeWithAggregatesFilter<"UsageTracking"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionCreateInput = {
    id?: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    user: UserCreateNestedOneWithoutUser_sessionsInput
  }

  export type UserSessionUncheckedCreateInput = {
    id?: string
    user_id: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUser_sessionsNestedInput
  }

  export type UserSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionCreateManyInput = {
    id?: string
    user_id: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyCreateInput = {
    id?: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user: UserCreateNestedOneWithoutApi_keysInput
  }

  export type ApiKeyUncheckedCreateInput = {
    id?: string
    user_id: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ApiKeyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutApi_keysNestedInput
  }

  export type ApiKeyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyCreateManyInput = {
    id?: string
    user_id: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ApiKeyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectCreateInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    repository?: RepositoryCreateNestedOneWithoutProjectInput
    project_members?: ProjectMemberCreateNestedManyWithoutProjectInput
    documents?: DocumentCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    repository_id?: string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
    documents?: DocumentUncheckedCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    repository?: RepositoryUpdateOneWithoutProjectNestedInput
    project_members?: ProjectMemberUpdateManyWithoutProjectNestedInput
    documents?: DocumentUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    repository_id?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project_members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type ProjectCreateManyInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    repository_id?: string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    repository_id?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateInput = {
    id?: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
    project: ProjectCreateNestedOneWithoutProject_membersInput
    user: UserCreateNestedOneWithoutProject_membersInput
  }

  export type ProjectMemberUncheckedCreateInput = {
    id?: string
    project_id: string
    user_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutProject_membersNestedInput
    user?: UserUpdateOneRequiredWithoutProject_membersNestedInput
  }

  export type ProjectMemberUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateManyInput = {
    id?: string
    project_id: string
    user_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RepositoryCreateInput = {
    id?: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description?: string | null
    clone_url: string
    ssh_url: string
    default_branch?: string
    is_private?: boolean
    webhook_id?: number | null
    webhook_secret?: string | null
    last_sync_at?: Date | string | null
    sync_status?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectCreateNestedOneWithoutRepositoryInput
  }

  export type RepositoryUncheckedCreateInput = {
    id?: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description?: string | null
    clone_url: string
    ssh_url: string
    default_branch?: string
    is_private?: boolean
    webhook_id?: number | null
    webhook_secret?: string | null
    last_sync_at?: Date | string | null
    sync_status?: string | null
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectUncheckedCreateNestedOneWithoutRepositoryInput
  }

  export type RepositoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneWithoutRepositoryNestedInput
  }

  export type RepositoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUncheckedUpdateOneWithoutRepositoryNestedInput
  }

  export type RepositoryCreateManyInput = {
    id?: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description?: string | null
    clone_url: string
    ssh_url: string
    default_branch?: string
    is_private?: boolean
    webhook_id?: number | null
    webhook_secret?: string | null
    last_sync_at?: Date | string | null
    sync_status?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type RepositoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RepositoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentCreateInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    project: ProjectCreateNestedOneWithoutDocumentsInput
    creator: UserCreateNestedOneWithoutDocumentsInput
    versions?: DocumentVersionCreateNestedManyWithoutDocumentInput
  }

  export type DocumentUncheckedCreateInput = {
    id?: string
    project_id: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by: string
    created_at?: Date | string
    updated_at?: Date | string
    versions?: DocumentVersionUncheckedCreateNestedManyWithoutDocumentInput
  }

  export type DocumentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutDocumentsNestedInput
    creator?: UserUpdateOneRequiredWithoutDocumentsNestedInput
    versions?: DocumentVersionUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    versions?: DocumentVersionUncheckedUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentCreateManyInput = {
    id?: string
    project_id: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type DocumentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionCreateInput = {
    id?: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_at?: Date | string
    document: DocumentCreateNestedOneWithoutVersionsInput
    creator: UserCreateNestedOneWithoutDocument_versionsInput
  }

  export type DocumentVersionUncheckedCreateInput = {
    id?: string
    document_id: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_by: string
    created_at?: Date | string
  }

  export type DocumentVersionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    document?: DocumentUpdateOneRequiredWithoutVersionsNestedInput
    creator?: UserUpdateOneRequiredWithoutDocument_versionsNestedInput
  }

  export type DocumentVersionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    document_id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionCreateManyInput = {
    id?: string
    document_id: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_by: string
    created_at?: Date | string
  }

  export type DocumentVersionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    document_id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiRequestCreateInput = {
    id?: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectCreateNestedOneWithoutAi_requestsInput
    user: UserCreateNestedOneWithoutAi_requestsInput
    responses?: AiResponseCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUncheckedCreateInput = {
    id?: string
    project_id?: string | null
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    responses?: AiResponseUncheckedCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingUncheckedCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneWithoutAi_requestsNestedInput
    user?: UserUpdateOneRequiredWithoutAi_requestsNestedInput
    responses?: AiResponseUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    responses?: AiResponseUncheckedUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUncheckedUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestCreateManyInput = {
    id?: string
    project_id?: string | null
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type AiRequestUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiRequestUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseCreateInput = {
    id?: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    request: AiRequestCreateNestedOneWithoutResponsesInput
  }

  export type AiResponseUncheckedCreateInput = {
    id?: string
    request_id: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
  }

  export type AiResponseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    request?: AiRequestUpdateOneRequiredWithoutResponsesNestedInput
  }

  export type AiResponseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    request_id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseCreateManyInput = {
    id?: string
    request_id: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
  }

  export type AiResponseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    request_id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingCreateInput = {
    id?: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    request: AiRequestCreateNestedOneWithoutUsageInput
  }

  export type UsageTrackingUncheckedCreateInput = {
    id?: string
    request_id: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
  }

  export type UsageTrackingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    request?: AiRequestUpdateOneRequiredWithoutUsageNestedInput
  }

  export type UsageTrackingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    request_id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingCreateManyInput = {
    id?: string
    request_id: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
  }

  export type UsageTrackingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    request_id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UserSessionListRelationFilter = {
    every?: UserSessionWhereInput
    some?: UserSessionWhereInput
    none?: UserSessionWhereInput
  }

  export type ApiKeyListRelationFilter = {
    every?: ApiKeyWhereInput
    some?: ApiKeyWhereInput
    none?: ApiKeyWhereInput
  }

  export type ProjectMemberListRelationFilter = {
    every?: ProjectMemberWhereInput
    some?: ProjectMemberWhereInput
    none?: ProjectMemberWhereInput
  }

  export type DocumentListRelationFilter = {
    every?: DocumentWhereInput
    some?: DocumentWhereInput
    none?: DocumentWhereInput
  }

  export type DocumentVersionListRelationFilter = {
    every?: DocumentVersionWhereInput
    some?: DocumentVersionWhereInput
    none?: DocumentVersionWhereInput
  }

  export type AiRequestListRelationFilter = {
    every?: AiRequestWhereInput
    some?: AiRequestWhereInput
    none?: AiRequestWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ApiKeyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProjectMemberOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DocumentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DocumentVersionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AiRequestOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    github_id?: SortOrder
    github_username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    bio?: SortOrder
    company?: SortOrder
    location?: SortOrder
    timezone?: SortOrder
    locale?: SortOrder
    first_login_at?: SortOrder
    last_login_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    github_id?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    github_id?: SortOrder
    github_username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    bio?: SortOrder
    company?: SortOrder
    location?: SortOrder
    timezone?: SortOrder
    locale?: SortOrder
    first_login_at?: SortOrder
    last_login_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    github_id?: SortOrder
    github_username?: SortOrder
    name?: SortOrder
    avatar_url?: SortOrder
    bio?: SortOrder
    company?: SortOrder
    location?: SortOrder
    timezone?: SortOrder
    locale?: SortOrder
    first_login_at?: SortOrder
    last_login_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    github_id?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type UserSessionCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    session_id?: SortOrder
    access_token?: SortOrder
    refresh_token?: SortOrder
    expires_at?: SortOrder
    ip_address?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UserSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    session_id?: SortOrder
    access_token?: SortOrder
    refresh_token?: SortOrder
    expires_at?: SortOrder
    ip_address?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UserSessionMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    session_id?: SortOrder
    access_token?: SortOrder
    refresh_token?: SortOrder
    expires_at?: SortOrder
    ip_address?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ApiKeyCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    key_hash?: SortOrder
    permissions?: SortOrder
    last_used_at?: SortOrder
    expires_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ApiKeyMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    key_hash?: SortOrder
    last_used_at?: SortOrder
    expires_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ApiKeyMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    name?: SortOrder
    key_hash?: SortOrder
    last_used_at?: SortOrder
    expires_at?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumProjectStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ProjectStatus | EnumProjectStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProjectStatusFilter<$PrismaModel> | $Enums.ProjectStatus
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type RepositoryNullableScalarRelationFilter = {
    is?: RepositoryWhereInput | null
    isNot?: RepositoryWhereInput | null
  }

  export type ProjectCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    status?: SortOrder
    repository_id?: SortOrder
    settings?: SortOrder
    ai_model?: SortOrder
    ai_budget?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ProjectAvgOrderByAggregateInput = {
    ai_budget?: SortOrder
  }

  export type ProjectMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    status?: SortOrder
    repository_id?: SortOrder
    ai_model?: SortOrder
    ai_budget?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ProjectMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    status?: SortOrder
    repository_id?: SortOrder
    ai_model?: SortOrder
    ai_budget?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ProjectSumOrderByAggregateInput = {
    ai_budget?: SortOrder
  }

  export type EnumProjectStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProjectStatus | EnumProjectStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProjectStatusWithAggregatesFilter<$PrismaModel> | $Enums.ProjectStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProjectStatusFilter<$PrismaModel>
    _max?: NestedEnumProjectStatusFilter<$PrismaModel>
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumMemberRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.MemberRole | EnumMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMemberRoleFilter<$PrismaModel> | $Enums.MemberRole
  }

  export type ProjectScalarRelationFilter = {
    is?: ProjectWhereInput
    isNot?: ProjectWhereInput
  }

  export type ProjectMemberProject_idUser_idCompoundUniqueInput = {
    project_id: string
    user_id: string
  }

  export type ProjectMemberCountOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    joined_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ProjectMemberMaxOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    joined_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type ProjectMemberMinOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    joined_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type EnumMemberRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MemberRole | EnumMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMemberRoleWithAggregatesFilter<$PrismaModel> | $Enums.MemberRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMemberRoleFilter<$PrismaModel>
    _max?: NestedEnumMemberRoleFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ProjectNullableScalarRelationFilter = {
    is?: ProjectWhereInput | null
    isNot?: ProjectWhereInput | null
  }

  export type RepositoryCountOrderByAggregateInput = {
    id?: SortOrder
    github_id?: SortOrder
    full_name?: SortOrder
    name?: SortOrder
    owner?: SortOrder
    description?: SortOrder
    clone_url?: SortOrder
    ssh_url?: SortOrder
    default_branch?: SortOrder
    is_private?: SortOrder
    webhook_id?: SortOrder
    webhook_secret?: SortOrder
    last_sync_at?: SortOrder
    sync_status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type RepositoryAvgOrderByAggregateInput = {
    github_id?: SortOrder
    webhook_id?: SortOrder
  }

  export type RepositoryMaxOrderByAggregateInput = {
    id?: SortOrder
    github_id?: SortOrder
    full_name?: SortOrder
    name?: SortOrder
    owner?: SortOrder
    description?: SortOrder
    clone_url?: SortOrder
    ssh_url?: SortOrder
    default_branch?: SortOrder
    is_private?: SortOrder
    webhook_id?: SortOrder
    webhook_secret?: SortOrder
    last_sync_at?: SortOrder
    sync_status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type RepositoryMinOrderByAggregateInput = {
    id?: SortOrder
    github_id?: SortOrder
    full_name?: SortOrder
    name?: SortOrder
    owner?: SortOrder
    description?: SortOrder
    clone_url?: SortOrder
    ssh_url?: SortOrder
    default_branch?: SortOrder
    is_private?: SortOrder
    webhook_id?: SortOrder
    webhook_secret?: SortOrder
    last_sync_at?: SortOrder
    sync_status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type RepositorySumOrderByAggregateInput = {
    github_id?: SortOrder
    webhook_id?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumDocumentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentType | EnumDocumentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentTypeFilter<$PrismaModel> | $Enums.DocumentType
  }

  export type EnumDocumentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentStatus | EnumDocumentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentStatusFilter<$PrismaModel> | $Enums.DocumentStatus
  }

  export type DocumentCountOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    type?: SortOrder
    status?: SortOrder
    file_path?: SortOrder
    metadata?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type DocumentMaxOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    type?: SortOrder
    status?: SortOrder
    file_path?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type DocumentMinOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    type?: SortOrder
    status?: SortOrder
    file_path?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type EnumDocumentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentType | EnumDocumentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentTypeWithAggregatesFilter<$PrismaModel> | $Enums.DocumentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDocumentTypeFilter<$PrismaModel>
    _max?: NestedEnumDocumentTypeFilter<$PrismaModel>
  }

  export type EnumDocumentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentStatus | EnumDocumentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentStatusWithAggregatesFilter<$PrismaModel> | $Enums.DocumentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDocumentStatusFilter<$PrismaModel>
    _max?: NestedEnumDocumentStatusFilter<$PrismaModel>
  }

  export type DocumentScalarRelationFilter = {
    is?: DocumentWhereInput
    isNot?: DocumentWhereInput
  }

  export type DocumentVersionDocument_idVersionCompoundUniqueInput = {
    document_id: string
    version: number
  }

  export type DocumentVersionCountOrderByAggregateInput = {
    id?: SortOrder
    document_id?: SortOrder
    version?: SortOrder
    content?: SortOrder
    diff_from_previous?: SortOrder
    commit_hash?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
  }

  export type DocumentVersionAvgOrderByAggregateInput = {
    version?: SortOrder
  }

  export type DocumentVersionMaxOrderByAggregateInput = {
    id?: SortOrder
    document_id?: SortOrder
    version?: SortOrder
    content?: SortOrder
    diff_from_previous?: SortOrder
    commit_hash?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
  }

  export type DocumentVersionMinOrderByAggregateInput = {
    id?: SortOrder
    document_id?: SortOrder
    version?: SortOrder
    content?: SortOrder
    diff_from_previous?: SortOrder
    commit_hash?: SortOrder
    created_by?: SortOrder
    created_at?: SortOrder
  }

  export type DocumentVersionSumOrderByAggregateInput = {
    version?: SortOrder
  }

  export type EnumAiRequestTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestType | EnumAiRequestTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestTypeFilter<$PrismaModel> | $Enums.AiRequestType
  }

  export type EnumAiRequestStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestStatus | EnumAiRequestStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestStatusFilter<$PrismaModel> | $Enums.AiRequestStatus
  }

  export type AiResponseListRelationFilter = {
    every?: AiResponseWhereInput
    some?: AiResponseWhereInput
    none?: AiResponseWhereInput
  }

  export type UsageTrackingListRelationFilter = {
    every?: UsageTrackingWhereInput
    some?: UsageTrackingWhereInput
    none?: UsageTrackingWhereInput
  }

  export type AiResponseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UsageTrackingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AiRequestCountOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    prompt?: SortOrder
    context?: SortOrder
    model?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type AiRequestMaxOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    prompt?: SortOrder
    model?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type AiRequestMinOrderByAggregateInput = {
    id?: SortOrder
    project_id?: SortOrder
    user_id?: SortOrder
    type?: SortOrder
    status?: SortOrder
    prompt?: SortOrder
    model?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type EnumAiRequestTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestType | EnumAiRequestTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestTypeWithAggregatesFilter<$PrismaModel> | $Enums.AiRequestType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiRequestTypeFilter<$PrismaModel>
    _max?: NestedEnumAiRequestTypeFilter<$PrismaModel>
  }

  export type EnumAiRequestStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestStatus | EnumAiRequestStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiRequestStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiRequestStatusFilter<$PrismaModel>
    _max?: NestedEnumAiRequestStatusFilter<$PrismaModel>
  }

  export type AiRequestScalarRelationFilter = {
    is?: AiRequestWhereInput
    isNot?: AiRequestWhereInput
  }

  export type AiResponseCountOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    content?: SortOrder
    tokens_used?: SortOrder
    model?: SortOrder
    finish_reason?: SortOrder
    metadata?: SortOrder
    created_at?: SortOrder
  }

  export type AiResponseAvgOrderByAggregateInput = {
    tokens_used?: SortOrder
  }

  export type AiResponseMaxOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    content?: SortOrder
    tokens_used?: SortOrder
    model?: SortOrder
    finish_reason?: SortOrder
    created_at?: SortOrder
  }

  export type AiResponseMinOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    content?: SortOrder
    tokens_used?: SortOrder
    model?: SortOrder
    finish_reason?: SortOrder
    created_at?: SortOrder
  }

  export type AiResponseSumOrderByAggregateInput = {
    tokens_used?: SortOrder
  }

  export type UsageTrackingCountOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    model?: SortOrder
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrder
    created_at?: SortOrder
  }

  export type UsageTrackingAvgOrderByAggregateInput = {
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrder
  }

  export type UsageTrackingMaxOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    model?: SortOrder
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrder
    created_at?: SortOrder
  }

  export type UsageTrackingMinOrderByAggregateInput = {
    id?: SortOrder
    request_id?: SortOrder
    model?: SortOrder
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrder
    created_at?: SortOrder
  }

  export type UsageTrackingSumOrderByAggregateInput = {
    prompt_tokens?: SortOrder
    completion_tokens?: SortOrder
    total_tokens?: SortOrder
    cost_estimate?: SortOrder
  }

  export type UserSessionCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
  }

  export type ApiKeyCreateNestedManyWithoutUserInput = {
    create?: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput> | ApiKeyCreateWithoutUserInput[] | ApiKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ApiKeyCreateOrConnectWithoutUserInput | ApiKeyCreateOrConnectWithoutUserInput[]
    createMany?: ApiKeyCreateManyUserInputEnvelope
    connect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
  }

  export type ProjectMemberCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type DocumentCreateNestedManyWithoutCreatorInput = {
    create?: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput> | DocumentCreateWithoutCreatorInput[] | DocumentUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutCreatorInput | DocumentCreateOrConnectWithoutCreatorInput[]
    createMany?: DocumentCreateManyCreatorInputEnvelope
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
  }

  export type DocumentVersionCreateNestedManyWithoutCreatorInput = {
    create?: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput> | DocumentVersionCreateWithoutCreatorInput[] | DocumentVersionUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutCreatorInput | DocumentVersionCreateOrConnectWithoutCreatorInput[]
    createMany?: DocumentVersionCreateManyCreatorInputEnvelope
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
  }

  export type AiRequestCreateNestedManyWithoutUserInput = {
    create?: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput> | AiRequestCreateWithoutUserInput[] | AiRequestUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutUserInput | AiRequestCreateOrConnectWithoutUserInput[]
    createMany?: AiRequestCreateManyUserInputEnvelope
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
  }

  export type UserSessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
  }

  export type ApiKeyUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput> | ApiKeyCreateWithoutUserInput[] | ApiKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ApiKeyCreateOrConnectWithoutUserInput | ApiKeyCreateOrConnectWithoutUserInput[]
    createMany?: ApiKeyCreateManyUserInputEnvelope
    connect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
  }

  export type ProjectMemberUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type DocumentUncheckedCreateNestedManyWithoutCreatorInput = {
    create?: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput> | DocumentCreateWithoutCreatorInput[] | DocumentUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutCreatorInput | DocumentCreateOrConnectWithoutCreatorInput[]
    createMany?: DocumentCreateManyCreatorInputEnvelope
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
  }

  export type DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput = {
    create?: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput> | DocumentVersionCreateWithoutCreatorInput[] | DocumentVersionUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutCreatorInput | DocumentVersionCreateOrConnectWithoutCreatorInput[]
    createMany?: DocumentVersionCreateManyCreatorInputEnvelope
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
  }

  export type AiRequestUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput> | AiRequestCreateWithoutUserInput[] | AiRequestUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutUserInput | AiRequestCreateOrConnectWithoutUserInput[]
    createMany?: AiRequestCreateManyUserInputEnvelope
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserSessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    upsert?: UserSessionUpsertWithWhereUniqueWithoutUserInput | UserSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    set?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    disconnect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    delete?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    update?: UserSessionUpdateWithWhereUniqueWithoutUserInput | UserSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSessionUpdateManyWithWhereWithoutUserInput | UserSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
  }

  export type ApiKeyUpdateManyWithoutUserNestedInput = {
    create?: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput> | ApiKeyCreateWithoutUserInput[] | ApiKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ApiKeyCreateOrConnectWithoutUserInput | ApiKeyCreateOrConnectWithoutUserInput[]
    upsert?: ApiKeyUpsertWithWhereUniqueWithoutUserInput | ApiKeyUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ApiKeyCreateManyUserInputEnvelope
    set?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    disconnect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    delete?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    connect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    update?: ApiKeyUpdateWithWhereUniqueWithoutUserInput | ApiKeyUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ApiKeyUpdateManyWithWhereWithoutUserInput | ApiKeyUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ApiKeyScalarWhereInput | ApiKeyScalarWhereInput[]
  }

  export type ProjectMemberUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutUserInput | ProjectMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutUserInput | ProjectMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutUserInput | ProjectMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type DocumentUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput> | DocumentCreateWithoutCreatorInput[] | DocumentUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutCreatorInput | DocumentCreateOrConnectWithoutCreatorInput[]
    upsert?: DocumentUpsertWithWhereUniqueWithoutCreatorInput | DocumentUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: DocumentCreateManyCreatorInputEnvelope
    set?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    disconnect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    delete?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    update?: DocumentUpdateWithWhereUniqueWithoutCreatorInput | DocumentUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: DocumentUpdateManyWithWhereWithoutCreatorInput | DocumentUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
  }

  export type DocumentVersionUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput> | DocumentVersionCreateWithoutCreatorInput[] | DocumentVersionUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutCreatorInput | DocumentVersionCreateOrConnectWithoutCreatorInput[]
    upsert?: DocumentVersionUpsertWithWhereUniqueWithoutCreatorInput | DocumentVersionUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: DocumentVersionCreateManyCreatorInputEnvelope
    set?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    disconnect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    delete?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    update?: DocumentVersionUpdateWithWhereUniqueWithoutCreatorInput | DocumentVersionUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: DocumentVersionUpdateManyWithWhereWithoutCreatorInput | DocumentVersionUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
  }

  export type AiRequestUpdateManyWithoutUserNestedInput = {
    create?: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput> | AiRequestCreateWithoutUserInput[] | AiRequestUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutUserInput | AiRequestCreateOrConnectWithoutUserInput[]
    upsert?: AiRequestUpsertWithWhereUniqueWithoutUserInput | AiRequestUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AiRequestCreateManyUserInputEnvelope
    set?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    disconnect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    delete?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    update?: AiRequestUpdateWithWhereUniqueWithoutUserInput | AiRequestUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AiRequestUpdateManyWithWhereWithoutUserInput | AiRequestUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
  }

  export type UserSessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    upsert?: UserSessionUpsertWithWhereUniqueWithoutUserInput | UserSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    set?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    disconnect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    delete?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    update?: UserSessionUpdateWithWhereUniqueWithoutUserInput | UserSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSessionUpdateManyWithWhereWithoutUserInput | UserSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
  }

  export type ApiKeyUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput> | ApiKeyCreateWithoutUserInput[] | ApiKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ApiKeyCreateOrConnectWithoutUserInput | ApiKeyCreateOrConnectWithoutUserInput[]
    upsert?: ApiKeyUpsertWithWhereUniqueWithoutUserInput | ApiKeyUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ApiKeyCreateManyUserInputEnvelope
    set?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    disconnect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    delete?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    connect?: ApiKeyWhereUniqueInput | ApiKeyWhereUniqueInput[]
    update?: ApiKeyUpdateWithWhereUniqueWithoutUserInput | ApiKeyUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ApiKeyUpdateManyWithWhereWithoutUserInput | ApiKeyUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ApiKeyScalarWhereInput | ApiKeyScalarWhereInput[]
  }

  export type ProjectMemberUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutUserInput | ProjectMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutUserInput | ProjectMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutUserInput | ProjectMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type DocumentUncheckedUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput> | DocumentCreateWithoutCreatorInput[] | DocumentUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutCreatorInput | DocumentCreateOrConnectWithoutCreatorInput[]
    upsert?: DocumentUpsertWithWhereUniqueWithoutCreatorInput | DocumentUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: DocumentCreateManyCreatorInputEnvelope
    set?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    disconnect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    delete?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    update?: DocumentUpdateWithWhereUniqueWithoutCreatorInput | DocumentUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: DocumentUpdateManyWithWhereWithoutCreatorInput | DocumentUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
  }

  export type DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput> | DocumentVersionCreateWithoutCreatorInput[] | DocumentVersionUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutCreatorInput | DocumentVersionCreateOrConnectWithoutCreatorInput[]
    upsert?: DocumentVersionUpsertWithWhereUniqueWithoutCreatorInput | DocumentVersionUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: DocumentVersionCreateManyCreatorInputEnvelope
    set?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    disconnect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    delete?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    update?: DocumentVersionUpdateWithWhereUniqueWithoutCreatorInput | DocumentVersionUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: DocumentVersionUpdateManyWithWhereWithoutCreatorInput | DocumentVersionUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
  }

  export type AiRequestUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput> | AiRequestCreateWithoutUserInput[] | AiRequestUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutUserInput | AiRequestCreateOrConnectWithoutUserInput[]
    upsert?: AiRequestUpsertWithWhereUniqueWithoutUserInput | AiRequestUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AiRequestCreateManyUserInputEnvelope
    set?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    disconnect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    delete?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    update?: AiRequestUpdateWithWhereUniqueWithoutUserInput | AiRequestUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AiRequestUpdateManyWithWhereWithoutUserInput | AiRequestUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutUser_sessionsInput = {
    create?: XOR<UserCreateWithoutUser_sessionsInput, UserUncheckedCreateWithoutUser_sessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUser_sessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutUser_sessionsNestedInput = {
    create?: XOR<UserCreateWithoutUser_sessionsInput, UserUncheckedCreateWithoutUser_sessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUser_sessionsInput
    upsert?: UserUpsertWithoutUser_sessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUser_sessionsInput, UserUpdateWithoutUser_sessionsInput>, UserUncheckedUpdateWithoutUser_sessionsInput>
  }

  export type UserCreateNestedOneWithoutApi_keysInput = {
    create?: XOR<UserCreateWithoutApi_keysInput, UserUncheckedCreateWithoutApi_keysInput>
    connectOrCreate?: UserCreateOrConnectWithoutApi_keysInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutApi_keysNestedInput = {
    create?: XOR<UserCreateWithoutApi_keysInput, UserUncheckedCreateWithoutApi_keysInput>
    connectOrCreate?: UserCreateOrConnectWithoutApi_keysInput
    upsert?: UserUpsertWithoutApi_keysInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutApi_keysInput, UserUpdateWithoutApi_keysInput>, UserUncheckedUpdateWithoutApi_keysInput>
  }

  export type RepositoryCreateNestedOneWithoutProjectInput = {
    create?: XOR<RepositoryCreateWithoutProjectInput, RepositoryUncheckedCreateWithoutProjectInput>
    connectOrCreate?: RepositoryCreateOrConnectWithoutProjectInput
    connect?: RepositoryWhereUniqueInput
  }

  export type ProjectMemberCreateNestedManyWithoutProjectInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type DocumentCreateNestedManyWithoutProjectInput = {
    create?: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput> | DocumentCreateWithoutProjectInput[] | DocumentUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutProjectInput | DocumentCreateOrConnectWithoutProjectInput[]
    createMany?: DocumentCreateManyProjectInputEnvelope
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
  }

  export type AiRequestCreateNestedManyWithoutProjectInput = {
    create?: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput> | AiRequestCreateWithoutProjectInput[] | AiRequestUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutProjectInput | AiRequestCreateOrConnectWithoutProjectInput[]
    createMany?: AiRequestCreateManyProjectInputEnvelope
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
  }

  export type ProjectMemberUncheckedCreateNestedManyWithoutProjectInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type DocumentUncheckedCreateNestedManyWithoutProjectInput = {
    create?: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput> | DocumentCreateWithoutProjectInput[] | DocumentUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutProjectInput | DocumentCreateOrConnectWithoutProjectInput[]
    createMany?: DocumentCreateManyProjectInputEnvelope
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
  }

  export type AiRequestUncheckedCreateNestedManyWithoutProjectInput = {
    create?: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput> | AiRequestCreateWithoutProjectInput[] | AiRequestUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutProjectInput | AiRequestCreateOrConnectWithoutProjectInput[]
    createMany?: AiRequestCreateManyProjectInputEnvelope
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
  }

  export type EnumProjectStatusFieldUpdateOperationsInput = {
    set?: $Enums.ProjectStatus
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type RepositoryUpdateOneWithoutProjectNestedInput = {
    create?: XOR<RepositoryCreateWithoutProjectInput, RepositoryUncheckedCreateWithoutProjectInput>
    connectOrCreate?: RepositoryCreateOrConnectWithoutProjectInput
    upsert?: RepositoryUpsertWithoutProjectInput
    disconnect?: RepositoryWhereInput | boolean
    delete?: RepositoryWhereInput | boolean
    connect?: RepositoryWhereUniqueInput
    update?: XOR<XOR<RepositoryUpdateToOneWithWhereWithoutProjectInput, RepositoryUpdateWithoutProjectInput>, RepositoryUncheckedUpdateWithoutProjectInput>
  }

  export type ProjectMemberUpdateManyWithoutProjectNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutProjectInput | ProjectMemberUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutProjectInput | ProjectMemberUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutProjectInput | ProjectMemberUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type DocumentUpdateManyWithoutProjectNestedInput = {
    create?: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput> | DocumentCreateWithoutProjectInput[] | DocumentUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutProjectInput | DocumentCreateOrConnectWithoutProjectInput[]
    upsert?: DocumentUpsertWithWhereUniqueWithoutProjectInput | DocumentUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: DocumentCreateManyProjectInputEnvelope
    set?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    disconnect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    delete?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    update?: DocumentUpdateWithWhereUniqueWithoutProjectInput | DocumentUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: DocumentUpdateManyWithWhereWithoutProjectInput | DocumentUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
  }

  export type AiRequestUpdateManyWithoutProjectNestedInput = {
    create?: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput> | AiRequestCreateWithoutProjectInput[] | AiRequestUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutProjectInput | AiRequestCreateOrConnectWithoutProjectInput[]
    upsert?: AiRequestUpsertWithWhereUniqueWithoutProjectInput | AiRequestUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: AiRequestCreateManyProjectInputEnvelope
    set?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    disconnect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    delete?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    update?: AiRequestUpdateWithWhereUniqueWithoutProjectInput | AiRequestUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: AiRequestUpdateManyWithWhereWithoutProjectInput | AiRequestUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
  }

  export type ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutProjectInput | ProjectMemberUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutProjectInput | ProjectMemberUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutProjectInput | ProjectMemberUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type DocumentUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput> | DocumentCreateWithoutProjectInput[] | DocumentUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: DocumentCreateOrConnectWithoutProjectInput | DocumentCreateOrConnectWithoutProjectInput[]
    upsert?: DocumentUpsertWithWhereUniqueWithoutProjectInput | DocumentUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: DocumentCreateManyProjectInputEnvelope
    set?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    disconnect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    delete?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    connect?: DocumentWhereUniqueInput | DocumentWhereUniqueInput[]
    update?: DocumentUpdateWithWhereUniqueWithoutProjectInput | DocumentUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: DocumentUpdateManyWithWhereWithoutProjectInput | DocumentUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
  }

  export type AiRequestUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput> | AiRequestCreateWithoutProjectInput[] | AiRequestUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: AiRequestCreateOrConnectWithoutProjectInput | AiRequestCreateOrConnectWithoutProjectInput[]
    upsert?: AiRequestUpsertWithWhereUniqueWithoutProjectInput | AiRequestUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: AiRequestCreateManyProjectInputEnvelope
    set?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    disconnect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    delete?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    connect?: AiRequestWhereUniqueInput | AiRequestWhereUniqueInput[]
    update?: AiRequestUpdateWithWhereUniqueWithoutProjectInput | AiRequestUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: AiRequestUpdateManyWithWhereWithoutProjectInput | AiRequestUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
  }

  export type ProjectCreateNestedOneWithoutProject_membersInput = {
    create?: XOR<ProjectCreateWithoutProject_membersInput, ProjectUncheckedCreateWithoutProject_membersInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutProject_membersInput
    connect?: ProjectWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutProject_membersInput = {
    create?: XOR<UserCreateWithoutProject_membersInput, UserUncheckedCreateWithoutProject_membersInput>
    connectOrCreate?: UserCreateOrConnectWithoutProject_membersInput
    connect?: UserWhereUniqueInput
  }

  export type EnumMemberRoleFieldUpdateOperationsInput = {
    set?: $Enums.MemberRole
  }

  export type ProjectUpdateOneRequiredWithoutProject_membersNestedInput = {
    create?: XOR<ProjectCreateWithoutProject_membersInput, ProjectUncheckedCreateWithoutProject_membersInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutProject_membersInput
    upsert?: ProjectUpsertWithoutProject_membersInput
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutProject_membersInput, ProjectUpdateWithoutProject_membersInput>, ProjectUncheckedUpdateWithoutProject_membersInput>
  }

  export type UserUpdateOneRequiredWithoutProject_membersNestedInput = {
    create?: XOR<UserCreateWithoutProject_membersInput, UserUncheckedCreateWithoutProject_membersInput>
    connectOrCreate?: UserCreateOrConnectWithoutProject_membersInput
    upsert?: UserUpsertWithoutProject_membersInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProject_membersInput, UserUpdateWithoutProject_membersInput>, UserUncheckedUpdateWithoutProject_membersInput>
  }

  export type ProjectCreateNestedOneWithoutRepositoryInput = {
    create?: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutRepositoryInput
    connect?: ProjectWhereUniqueInput
  }

  export type ProjectUncheckedCreateNestedOneWithoutRepositoryInput = {
    create?: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutRepositoryInput
    connect?: ProjectWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ProjectUpdateOneWithoutRepositoryNestedInput = {
    create?: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutRepositoryInput
    upsert?: ProjectUpsertWithoutRepositoryInput
    disconnect?: ProjectWhereInput | boolean
    delete?: ProjectWhereInput | boolean
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutRepositoryInput, ProjectUpdateWithoutRepositoryInput>, ProjectUncheckedUpdateWithoutRepositoryInput>
  }

  export type ProjectUncheckedUpdateOneWithoutRepositoryNestedInput = {
    create?: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutRepositoryInput
    upsert?: ProjectUpsertWithoutRepositoryInput
    disconnect?: ProjectWhereInput | boolean
    delete?: ProjectWhereInput | boolean
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutRepositoryInput, ProjectUpdateWithoutRepositoryInput>, ProjectUncheckedUpdateWithoutRepositoryInput>
  }

  export type ProjectCreateNestedOneWithoutDocumentsInput = {
    create?: XOR<ProjectCreateWithoutDocumentsInput, ProjectUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutDocumentsInput
    connect?: ProjectWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutDocumentsInput = {
    create?: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocumentsInput
    connect?: UserWhereUniqueInput
  }

  export type DocumentVersionCreateNestedManyWithoutDocumentInput = {
    create?: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput> | DocumentVersionCreateWithoutDocumentInput[] | DocumentVersionUncheckedCreateWithoutDocumentInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutDocumentInput | DocumentVersionCreateOrConnectWithoutDocumentInput[]
    createMany?: DocumentVersionCreateManyDocumentInputEnvelope
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
  }

  export type DocumentVersionUncheckedCreateNestedManyWithoutDocumentInput = {
    create?: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput> | DocumentVersionCreateWithoutDocumentInput[] | DocumentVersionUncheckedCreateWithoutDocumentInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutDocumentInput | DocumentVersionCreateOrConnectWithoutDocumentInput[]
    createMany?: DocumentVersionCreateManyDocumentInputEnvelope
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
  }

  export type EnumDocumentTypeFieldUpdateOperationsInput = {
    set?: $Enums.DocumentType
  }

  export type EnumDocumentStatusFieldUpdateOperationsInput = {
    set?: $Enums.DocumentStatus
  }

  export type ProjectUpdateOneRequiredWithoutDocumentsNestedInput = {
    create?: XOR<ProjectCreateWithoutDocumentsInput, ProjectUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutDocumentsInput
    upsert?: ProjectUpsertWithoutDocumentsInput
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutDocumentsInput, ProjectUpdateWithoutDocumentsInput>, ProjectUncheckedUpdateWithoutDocumentsInput>
  }

  export type UserUpdateOneRequiredWithoutDocumentsNestedInput = {
    create?: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocumentsInput
    upsert?: UserUpsertWithoutDocumentsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutDocumentsInput, UserUpdateWithoutDocumentsInput>, UserUncheckedUpdateWithoutDocumentsInput>
  }

  export type DocumentVersionUpdateManyWithoutDocumentNestedInput = {
    create?: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput> | DocumentVersionCreateWithoutDocumentInput[] | DocumentVersionUncheckedCreateWithoutDocumentInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutDocumentInput | DocumentVersionCreateOrConnectWithoutDocumentInput[]
    upsert?: DocumentVersionUpsertWithWhereUniqueWithoutDocumentInput | DocumentVersionUpsertWithWhereUniqueWithoutDocumentInput[]
    createMany?: DocumentVersionCreateManyDocumentInputEnvelope
    set?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    disconnect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    delete?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    update?: DocumentVersionUpdateWithWhereUniqueWithoutDocumentInput | DocumentVersionUpdateWithWhereUniqueWithoutDocumentInput[]
    updateMany?: DocumentVersionUpdateManyWithWhereWithoutDocumentInput | DocumentVersionUpdateManyWithWhereWithoutDocumentInput[]
    deleteMany?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
  }

  export type DocumentVersionUncheckedUpdateManyWithoutDocumentNestedInput = {
    create?: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput> | DocumentVersionCreateWithoutDocumentInput[] | DocumentVersionUncheckedCreateWithoutDocumentInput[]
    connectOrCreate?: DocumentVersionCreateOrConnectWithoutDocumentInput | DocumentVersionCreateOrConnectWithoutDocumentInput[]
    upsert?: DocumentVersionUpsertWithWhereUniqueWithoutDocumentInput | DocumentVersionUpsertWithWhereUniqueWithoutDocumentInput[]
    createMany?: DocumentVersionCreateManyDocumentInputEnvelope
    set?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    disconnect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    delete?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    connect?: DocumentVersionWhereUniqueInput | DocumentVersionWhereUniqueInput[]
    update?: DocumentVersionUpdateWithWhereUniqueWithoutDocumentInput | DocumentVersionUpdateWithWhereUniqueWithoutDocumentInput[]
    updateMany?: DocumentVersionUpdateManyWithWhereWithoutDocumentInput | DocumentVersionUpdateManyWithWhereWithoutDocumentInput[]
    deleteMany?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
  }

  export type DocumentCreateNestedOneWithoutVersionsInput = {
    create?: XOR<DocumentCreateWithoutVersionsInput, DocumentUncheckedCreateWithoutVersionsInput>
    connectOrCreate?: DocumentCreateOrConnectWithoutVersionsInput
    connect?: DocumentWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutDocument_versionsInput = {
    create?: XOR<UserCreateWithoutDocument_versionsInput, UserUncheckedCreateWithoutDocument_versionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocument_versionsInput
    connect?: UserWhereUniqueInput
  }

  export type DocumentUpdateOneRequiredWithoutVersionsNestedInput = {
    create?: XOR<DocumentCreateWithoutVersionsInput, DocumentUncheckedCreateWithoutVersionsInput>
    connectOrCreate?: DocumentCreateOrConnectWithoutVersionsInput
    upsert?: DocumentUpsertWithoutVersionsInput
    connect?: DocumentWhereUniqueInput
    update?: XOR<XOR<DocumentUpdateToOneWithWhereWithoutVersionsInput, DocumentUpdateWithoutVersionsInput>, DocumentUncheckedUpdateWithoutVersionsInput>
  }

  export type UserUpdateOneRequiredWithoutDocument_versionsNestedInput = {
    create?: XOR<UserCreateWithoutDocument_versionsInput, UserUncheckedCreateWithoutDocument_versionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocument_versionsInput
    upsert?: UserUpsertWithoutDocument_versionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutDocument_versionsInput, UserUpdateWithoutDocument_versionsInput>, UserUncheckedUpdateWithoutDocument_versionsInput>
  }

  export type ProjectCreateNestedOneWithoutAi_requestsInput = {
    create?: XOR<ProjectCreateWithoutAi_requestsInput, ProjectUncheckedCreateWithoutAi_requestsInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutAi_requestsInput
    connect?: ProjectWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutAi_requestsInput = {
    create?: XOR<UserCreateWithoutAi_requestsInput, UserUncheckedCreateWithoutAi_requestsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAi_requestsInput
    connect?: UserWhereUniqueInput
  }

  export type AiResponseCreateNestedManyWithoutRequestInput = {
    create?: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput> | AiResponseCreateWithoutRequestInput[] | AiResponseUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: AiResponseCreateOrConnectWithoutRequestInput | AiResponseCreateOrConnectWithoutRequestInput[]
    createMany?: AiResponseCreateManyRequestInputEnvelope
    connect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
  }

  export type UsageTrackingCreateNestedManyWithoutRequestInput = {
    create?: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput> | UsageTrackingCreateWithoutRequestInput[] | UsageTrackingUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: UsageTrackingCreateOrConnectWithoutRequestInput | UsageTrackingCreateOrConnectWithoutRequestInput[]
    createMany?: UsageTrackingCreateManyRequestInputEnvelope
    connect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
  }

  export type AiResponseUncheckedCreateNestedManyWithoutRequestInput = {
    create?: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput> | AiResponseCreateWithoutRequestInput[] | AiResponseUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: AiResponseCreateOrConnectWithoutRequestInput | AiResponseCreateOrConnectWithoutRequestInput[]
    createMany?: AiResponseCreateManyRequestInputEnvelope
    connect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
  }

  export type UsageTrackingUncheckedCreateNestedManyWithoutRequestInput = {
    create?: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput> | UsageTrackingCreateWithoutRequestInput[] | UsageTrackingUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: UsageTrackingCreateOrConnectWithoutRequestInput | UsageTrackingCreateOrConnectWithoutRequestInput[]
    createMany?: UsageTrackingCreateManyRequestInputEnvelope
    connect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
  }

  export type EnumAiRequestTypeFieldUpdateOperationsInput = {
    set?: $Enums.AiRequestType
  }

  export type EnumAiRequestStatusFieldUpdateOperationsInput = {
    set?: $Enums.AiRequestStatus
  }

  export type ProjectUpdateOneWithoutAi_requestsNestedInput = {
    create?: XOR<ProjectCreateWithoutAi_requestsInput, ProjectUncheckedCreateWithoutAi_requestsInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutAi_requestsInput
    upsert?: ProjectUpsertWithoutAi_requestsInput
    disconnect?: ProjectWhereInput | boolean
    delete?: ProjectWhereInput | boolean
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutAi_requestsInput, ProjectUpdateWithoutAi_requestsInput>, ProjectUncheckedUpdateWithoutAi_requestsInput>
  }

  export type UserUpdateOneRequiredWithoutAi_requestsNestedInput = {
    create?: XOR<UserCreateWithoutAi_requestsInput, UserUncheckedCreateWithoutAi_requestsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAi_requestsInput
    upsert?: UserUpsertWithoutAi_requestsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAi_requestsInput, UserUpdateWithoutAi_requestsInput>, UserUncheckedUpdateWithoutAi_requestsInput>
  }

  export type AiResponseUpdateManyWithoutRequestNestedInput = {
    create?: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput> | AiResponseCreateWithoutRequestInput[] | AiResponseUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: AiResponseCreateOrConnectWithoutRequestInput | AiResponseCreateOrConnectWithoutRequestInput[]
    upsert?: AiResponseUpsertWithWhereUniqueWithoutRequestInput | AiResponseUpsertWithWhereUniqueWithoutRequestInput[]
    createMany?: AiResponseCreateManyRequestInputEnvelope
    set?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    disconnect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    delete?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    connect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    update?: AiResponseUpdateWithWhereUniqueWithoutRequestInput | AiResponseUpdateWithWhereUniqueWithoutRequestInput[]
    updateMany?: AiResponseUpdateManyWithWhereWithoutRequestInput | AiResponseUpdateManyWithWhereWithoutRequestInput[]
    deleteMany?: AiResponseScalarWhereInput | AiResponseScalarWhereInput[]
  }

  export type UsageTrackingUpdateManyWithoutRequestNestedInput = {
    create?: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput> | UsageTrackingCreateWithoutRequestInput[] | UsageTrackingUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: UsageTrackingCreateOrConnectWithoutRequestInput | UsageTrackingCreateOrConnectWithoutRequestInput[]
    upsert?: UsageTrackingUpsertWithWhereUniqueWithoutRequestInput | UsageTrackingUpsertWithWhereUniqueWithoutRequestInput[]
    createMany?: UsageTrackingCreateManyRequestInputEnvelope
    set?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    disconnect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    delete?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    connect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    update?: UsageTrackingUpdateWithWhereUniqueWithoutRequestInput | UsageTrackingUpdateWithWhereUniqueWithoutRequestInput[]
    updateMany?: UsageTrackingUpdateManyWithWhereWithoutRequestInput | UsageTrackingUpdateManyWithWhereWithoutRequestInput[]
    deleteMany?: UsageTrackingScalarWhereInput | UsageTrackingScalarWhereInput[]
  }

  export type AiResponseUncheckedUpdateManyWithoutRequestNestedInput = {
    create?: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput> | AiResponseCreateWithoutRequestInput[] | AiResponseUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: AiResponseCreateOrConnectWithoutRequestInput | AiResponseCreateOrConnectWithoutRequestInput[]
    upsert?: AiResponseUpsertWithWhereUniqueWithoutRequestInput | AiResponseUpsertWithWhereUniqueWithoutRequestInput[]
    createMany?: AiResponseCreateManyRequestInputEnvelope
    set?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    disconnect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    delete?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    connect?: AiResponseWhereUniqueInput | AiResponseWhereUniqueInput[]
    update?: AiResponseUpdateWithWhereUniqueWithoutRequestInput | AiResponseUpdateWithWhereUniqueWithoutRequestInput[]
    updateMany?: AiResponseUpdateManyWithWhereWithoutRequestInput | AiResponseUpdateManyWithWhereWithoutRequestInput[]
    deleteMany?: AiResponseScalarWhereInput | AiResponseScalarWhereInput[]
  }

  export type UsageTrackingUncheckedUpdateManyWithoutRequestNestedInput = {
    create?: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput> | UsageTrackingCreateWithoutRequestInput[] | UsageTrackingUncheckedCreateWithoutRequestInput[]
    connectOrCreate?: UsageTrackingCreateOrConnectWithoutRequestInput | UsageTrackingCreateOrConnectWithoutRequestInput[]
    upsert?: UsageTrackingUpsertWithWhereUniqueWithoutRequestInput | UsageTrackingUpsertWithWhereUniqueWithoutRequestInput[]
    createMany?: UsageTrackingCreateManyRequestInputEnvelope
    set?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    disconnect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    delete?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    connect?: UsageTrackingWhereUniqueInput | UsageTrackingWhereUniqueInput[]
    update?: UsageTrackingUpdateWithWhereUniqueWithoutRequestInput | UsageTrackingUpdateWithWhereUniqueWithoutRequestInput[]
    updateMany?: UsageTrackingUpdateManyWithWhereWithoutRequestInput | UsageTrackingUpdateManyWithWhereWithoutRequestInput[]
    deleteMany?: UsageTrackingScalarWhereInput | UsageTrackingScalarWhereInput[]
  }

  export type AiRequestCreateNestedOneWithoutResponsesInput = {
    create?: XOR<AiRequestCreateWithoutResponsesInput, AiRequestUncheckedCreateWithoutResponsesInput>
    connectOrCreate?: AiRequestCreateOrConnectWithoutResponsesInput
    connect?: AiRequestWhereUniqueInput
  }

  export type AiRequestUpdateOneRequiredWithoutResponsesNestedInput = {
    create?: XOR<AiRequestCreateWithoutResponsesInput, AiRequestUncheckedCreateWithoutResponsesInput>
    connectOrCreate?: AiRequestCreateOrConnectWithoutResponsesInput
    upsert?: AiRequestUpsertWithoutResponsesInput
    connect?: AiRequestWhereUniqueInput
    update?: XOR<XOR<AiRequestUpdateToOneWithWhereWithoutResponsesInput, AiRequestUpdateWithoutResponsesInput>, AiRequestUncheckedUpdateWithoutResponsesInput>
  }

  export type AiRequestCreateNestedOneWithoutUsageInput = {
    create?: XOR<AiRequestCreateWithoutUsageInput, AiRequestUncheckedCreateWithoutUsageInput>
    connectOrCreate?: AiRequestCreateOrConnectWithoutUsageInput
    connect?: AiRequestWhereUniqueInput
  }

  export type AiRequestUpdateOneRequiredWithoutUsageNestedInput = {
    create?: XOR<AiRequestCreateWithoutUsageInput, AiRequestUncheckedCreateWithoutUsageInput>
    connectOrCreate?: AiRequestCreateOrConnectWithoutUsageInput
    upsert?: AiRequestUpsertWithoutUsageInput
    connect?: AiRequestWhereUniqueInput
    update?: XOR<XOR<AiRequestUpdateToOneWithWhereWithoutUsageInput, AiRequestUpdateWithoutUsageInput>, AiRequestUncheckedUpdateWithoutUsageInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumProjectStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ProjectStatus | EnumProjectStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProjectStatusFilter<$PrismaModel> | $Enums.ProjectStatus
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumProjectStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProjectStatus | EnumProjectStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProjectStatus[] | ListEnumProjectStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProjectStatusWithAggregatesFilter<$PrismaModel> | $Enums.ProjectStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProjectStatusFilter<$PrismaModel>
    _max?: NestedEnumProjectStatusFilter<$PrismaModel>
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumMemberRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.MemberRole | EnumMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMemberRoleFilter<$PrismaModel> | $Enums.MemberRole
  }

  export type NestedEnumMemberRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MemberRole | EnumMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemberRole[] | ListEnumMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMemberRoleWithAggregatesFilter<$PrismaModel> | $Enums.MemberRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMemberRoleFilter<$PrismaModel>
    _max?: NestedEnumMemberRoleFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumDocumentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentType | EnumDocumentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentTypeFilter<$PrismaModel> | $Enums.DocumentType
  }

  export type NestedEnumDocumentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentStatus | EnumDocumentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentStatusFilter<$PrismaModel> | $Enums.DocumentStatus
  }

  export type NestedEnumDocumentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentType | EnumDocumentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentType[] | ListEnumDocumentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentTypeWithAggregatesFilter<$PrismaModel> | $Enums.DocumentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDocumentTypeFilter<$PrismaModel>
    _max?: NestedEnumDocumentTypeFilter<$PrismaModel>
  }

  export type NestedEnumDocumentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DocumentStatus | EnumDocumentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DocumentStatus[] | ListEnumDocumentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDocumentStatusWithAggregatesFilter<$PrismaModel> | $Enums.DocumentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDocumentStatusFilter<$PrismaModel>
    _max?: NestedEnumDocumentStatusFilter<$PrismaModel>
  }

  export type NestedEnumAiRequestTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestType | EnumAiRequestTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestTypeFilter<$PrismaModel> | $Enums.AiRequestType
  }

  export type NestedEnumAiRequestStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestStatus | EnumAiRequestStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestStatusFilter<$PrismaModel> | $Enums.AiRequestStatus
  }

  export type NestedEnumAiRequestTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestType | EnumAiRequestTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestType[] | ListEnumAiRequestTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestTypeWithAggregatesFilter<$PrismaModel> | $Enums.AiRequestType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiRequestTypeFilter<$PrismaModel>
    _max?: NestedEnumAiRequestTypeFilter<$PrismaModel>
  }

  export type NestedEnumAiRequestStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AiRequestStatus | EnumAiRequestStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AiRequestStatus[] | ListEnumAiRequestStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAiRequestStatusWithAggregatesFilter<$PrismaModel> | $Enums.AiRequestStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAiRequestStatusFilter<$PrismaModel>
    _max?: NestedEnumAiRequestStatusFilter<$PrismaModel>
  }

  export type UserSessionCreateWithoutUserInput = {
    id?: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserSessionUncheckedCreateWithoutUserInput = {
    id?: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserSessionCreateOrConnectWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    create: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput>
  }

  export type UserSessionCreateManyUserInputEnvelope = {
    data: UserSessionCreateManyUserInput | UserSessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ApiKeyCreateWithoutUserInput = {
    id?: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ApiKeyUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ApiKeyCreateOrConnectWithoutUserInput = {
    where: ApiKeyWhereUniqueInput
    create: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput>
  }

  export type ApiKeyCreateManyUserInputEnvelope = {
    data: ApiKeyCreateManyUserInput | ApiKeyCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ProjectMemberCreateWithoutUserInput = {
    id?: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
    project: ProjectCreateNestedOneWithoutProject_membersInput
  }

  export type ProjectMemberUncheckedCreateWithoutUserInput = {
    id?: string
    project_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberCreateOrConnectWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    create: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput>
  }

  export type ProjectMemberCreateManyUserInputEnvelope = {
    data: ProjectMemberCreateManyUserInput | ProjectMemberCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type DocumentCreateWithoutCreatorInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    project: ProjectCreateNestedOneWithoutDocumentsInput
    versions?: DocumentVersionCreateNestedManyWithoutDocumentInput
  }

  export type DocumentUncheckedCreateWithoutCreatorInput = {
    id?: string
    project_id: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    versions?: DocumentVersionUncheckedCreateNestedManyWithoutDocumentInput
  }

  export type DocumentCreateOrConnectWithoutCreatorInput = {
    where: DocumentWhereUniqueInput
    create: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput>
  }

  export type DocumentCreateManyCreatorInputEnvelope = {
    data: DocumentCreateManyCreatorInput | DocumentCreateManyCreatorInput[]
    skipDuplicates?: boolean
  }

  export type DocumentVersionCreateWithoutCreatorInput = {
    id?: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_at?: Date | string
    document: DocumentCreateNestedOneWithoutVersionsInput
  }

  export type DocumentVersionUncheckedCreateWithoutCreatorInput = {
    id?: string
    document_id: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_at?: Date | string
  }

  export type DocumentVersionCreateOrConnectWithoutCreatorInput = {
    where: DocumentVersionWhereUniqueInput
    create: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput>
  }

  export type DocumentVersionCreateManyCreatorInputEnvelope = {
    data: DocumentVersionCreateManyCreatorInput | DocumentVersionCreateManyCreatorInput[]
    skipDuplicates?: boolean
  }

  export type AiRequestCreateWithoutUserInput = {
    id?: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectCreateNestedOneWithoutAi_requestsInput
    responses?: AiResponseCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUncheckedCreateWithoutUserInput = {
    id?: string
    project_id?: string | null
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    responses?: AiResponseUncheckedCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingUncheckedCreateNestedManyWithoutRequestInput
  }

  export type AiRequestCreateOrConnectWithoutUserInput = {
    where: AiRequestWhereUniqueInput
    create: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput>
  }

  export type AiRequestCreateManyUserInputEnvelope = {
    data: AiRequestCreateManyUserInput | AiRequestCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UserSessionUpsertWithWhereUniqueWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    update: XOR<UserSessionUpdateWithoutUserInput, UserSessionUncheckedUpdateWithoutUserInput>
    create: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput>
  }

  export type UserSessionUpdateWithWhereUniqueWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    data: XOR<UserSessionUpdateWithoutUserInput, UserSessionUncheckedUpdateWithoutUserInput>
  }

  export type UserSessionUpdateManyWithWhereWithoutUserInput = {
    where: UserSessionScalarWhereInput
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyWithoutUserInput>
  }

  export type UserSessionScalarWhereInput = {
    AND?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
    OR?: UserSessionScalarWhereInput[]
    NOT?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
    id?: UuidFilter<"UserSession"> | string
    user_id?: UuidFilter<"UserSession"> | string
    session_id?: StringFilter<"UserSession"> | string
    access_token?: StringFilter<"UserSession"> | string
    refresh_token?: StringNullableFilter<"UserSession"> | string | null
    expires_at?: DateTimeFilter<"UserSession"> | Date | string
    ip_address?: StringNullableFilter<"UserSession"> | string | null
    user_agent?: StringNullableFilter<"UserSession"> | string | null
    created_at?: DateTimeFilter<"UserSession"> | Date | string
    updated_at?: DateTimeFilter<"UserSession"> | Date | string
  }

  export type ApiKeyUpsertWithWhereUniqueWithoutUserInput = {
    where: ApiKeyWhereUniqueInput
    update: XOR<ApiKeyUpdateWithoutUserInput, ApiKeyUncheckedUpdateWithoutUserInput>
    create: XOR<ApiKeyCreateWithoutUserInput, ApiKeyUncheckedCreateWithoutUserInput>
  }

  export type ApiKeyUpdateWithWhereUniqueWithoutUserInput = {
    where: ApiKeyWhereUniqueInput
    data: XOR<ApiKeyUpdateWithoutUserInput, ApiKeyUncheckedUpdateWithoutUserInput>
  }

  export type ApiKeyUpdateManyWithWhereWithoutUserInput = {
    where: ApiKeyScalarWhereInput
    data: XOR<ApiKeyUpdateManyMutationInput, ApiKeyUncheckedUpdateManyWithoutUserInput>
  }

  export type ApiKeyScalarWhereInput = {
    AND?: ApiKeyScalarWhereInput | ApiKeyScalarWhereInput[]
    OR?: ApiKeyScalarWhereInput[]
    NOT?: ApiKeyScalarWhereInput | ApiKeyScalarWhereInput[]
    id?: UuidFilter<"ApiKey"> | string
    user_id?: UuidFilter<"ApiKey"> | string
    name?: StringFilter<"ApiKey"> | string
    key_hash?: StringFilter<"ApiKey"> | string
    permissions?: JsonFilter<"ApiKey">
    last_used_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    expires_at?: DateTimeNullableFilter<"ApiKey"> | Date | string | null
    is_active?: BoolFilter<"ApiKey"> | boolean
    created_at?: DateTimeFilter<"ApiKey"> | Date | string
    updated_at?: DateTimeFilter<"ApiKey"> | Date | string
  }

  export type ProjectMemberUpsertWithWhereUniqueWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    update: XOR<ProjectMemberUpdateWithoutUserInput, ProjectMemberUncheckedUpdateWithoutUserInput>
    create: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput>
  }

  export type ProjectMemberUpdateWithWhereUniqueWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    data: XOR<ProjectMemberUpdateWithoutUserInput, ProjectMemberUncheckedUpdateWithoutUserInput>
  }

  export type ProjectMemberUpdateManyWithWhereWithoutUserInput = {
    where: ProjectMemberScalarWhereInput
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyWithoutUserInput>
  }

  export type ProjectMemberScalarWhereInput = {
    AND?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
    OR?: ProjectMemberScalarWhereInput[]
    NOT?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
    id?: UuidFilter<"ProjectMember"> | string
    project_id?: UuidFilter<"ProjectMember"> | string
    user_id?: UuidFilter<"ProjectMember"> | string
    role?: EnumMemberRoleFilter<"ProjectMember"> | $Enums.MemberRole
    joined_at?: DateTimeFilter<"ProjectMember"> | Date | string
    created_at?: DateTimeFilter<"ProjectMember"> | Date | string
    updated_at?: DateTimeFilter<"ProjectMember"> | Date | string
  }

  export type DocumentUpsertWithWhereUniqueWithoutCreatorInput = {
    where: DocumentWhereUniqueInput
    update: XOR<DocumentUpdateWithoutCreatorInput, DocumentUncheckedUpdateWithoutCreatorInput>
    create: XOR<DocumentCreateWithoutCreatorInput, DocumentUncheckedCreateWithoutCreatorInput>
  }

  export type DocumentUpdateWithWhereUniqueWithoutCreatorInput = {
    where: DocumentWhereUniqueInput
    data: XOR<DocumentUpdateWithoutCreatorInput, DocumentUncheckedUpdateWithoutCreatorInput>
  }

  export type DocumentUpdateManyWithWhereWithoutCreatorInput = {
    where: DocumentScalarWhereInput
    data: XOR<DocumentUpdateManyMutationInput, DocumentUncheckedUpdateManyWithoutCreatorInput>
  }

  export type DocumentScalarWhereInput = {
    AND?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
    OR?: DocumentScalarWhereInput[]
    NOT?: DocumentScalarWhereInput | DocumentScalarWhereInput[]
    id?: UuidFilter<"Document"> | string
    project_id?: UuidFilter<"Document"> | string
    title?: StringFilter<"Document"> | string
    description?: StringNullableFilter<"Document"> | string | null
    type?: EnumDocumentTypeFilter<"Document"> | $Enums.DocumentType
    status?: EnumDocumentStatusFilter<"Document"> | $Enums.DocumentStatus
    file_path?: StringNullableFilter<"Document"> | string | null
    metadata?: JsonFilter<"Document">
    created_by?: UuidFilter<"Document"> | string
    created_at?: DateTimeFilter<"Document"> | Date | string
    updated_at?: DateTimeFilter<"Document"> | Date | string
  }

  export type DocumentVersionUpsertWithWhereUniqueWithoutCreatorInput = {
    where: DocumentVersionWhereUniqueInput
    update: XOR<DocumentVersionUpdateWithoutCreatorInput, DocumentVersionUncheckedUpdateWithoutCreatorInput>
    create: XOR<DocumentVersionCreateWithoutCreatorInput, DocumentVersionUncheckedCreateWithoutCreatorInput>
  }

  export type DocumentVersionUpdateWithWhereUniqueWithoutCreatorInput = {
    where: DocumentVersionWhereUniqueInput
    data: XOR<DocumentVersionUpdateWithoutCreatorInput, DocumentVersionUncheckedUpdateWithoutCreatorInput>
  }

  export type DocumentVersionUpdateManyWithWhereWithoutCreatorInput = {
    where: DocumentVersionScalarWhereInput
    data: XOR<DocumentVersionUpdateManyMutationInput, DocumentVersionUncheckedUpdateManyWithoutCreatorInput>
  }

  export type DocumentVersionScalarWhereInput = {
    AND?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
    OR?: DocumentVersionScalarWhereInput[]
    NOT?: DocumentVersionScalarWhereInput | DocumentVersionScalarWhereInput[]
    id?: UuidFilter<"DocumentVersion"> | string
    document_id?: UuidFilter<"DocumentVersion"> | string
    version?: IntFilter<"DocumentVersion"> | number
    content?: StringFilter<"DocumentVersion"> | string
    diff_from_previous?: StringNullableFilter<"DocumentVersion"> | string | null
    commit_hash?: StringNullableFilter<"DocumentVersion"> | string | null
    created_by?: UuidFilter<"DocumentVersion"> | string
    created_at?: DateTimeFilter<"DocumentVersion"> | Date | string
  }

  export type AiRequestUpsertWithWhereUniqueWithoutUserInput = {
    where: AiRequestWhereUniqueInput
    update: XOR<AiRequestUpdateWithoutUserInput, AiRequestUncheckedUpdateWithoutUserInput>
    create: XOR<AiRequestCreateWithoutUserInput, AiRequestUncheckedCreateWithoutUserInput>
  }

  export type AiRequestUpdateWithWhereUniqueWithoutUserInput = {
    where: AiRequestWhereUniqueInput
    data: XOR<AiRequestUpdateWithoutUserInput, AiRequestUncheckedUpdateWithoutUserInput>
  }

  export type AiRequestUpdateManyWithWhereWithoutUserInput = {
    where: AiRequestScalarWhereInput
    data: XOR<AiRequestUpdateManyMutationInput, AiRequestUncheckedUpdateManyWithoutUserInput>
  }

  export type AiRequestScalarWhereInput = {
    AND?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
    OR?: AiRequestScalarWhereInput[]
    NOT?: AiRequestScalarWhereInput | AiRequestScalarWhereInput[]
    id?: UuidFilter<"AiRequest"> | string
    project_id?: UuidNullableFilter<"AiRequest"> | string | null
    user_id?: UuidFilter<"AiRequest"> | string
    type?: EnumAiRequestTypeFilter<"AiRequest"> | $Enums.AiRequestType
    status?: EnumAiRequestStatusFilter<"AiRequest"> | $Enums.AiRequestStatus
    prompt?: StringFilter<"AiRequest"> | string
    context?: JsonFilter<"AiRequest">
    model?: StringFilter<"AiRequest"> | string
    created_at?: DateTimeFilter<"AiRequest"> | Date | string
    updated_at?: DateTimeFilter<"AiRequest"> | Date | string
  }

  export type UserCreateWithoutUser_sessionsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUser_sessionsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUser_sessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUser_sessionsInput, UserUncheckedCreateWithoutUser_sessionsInput>
  }

  export type UserUpsertWithoutUser_sessionsInput = {
    update: XOR<UserUpdateWithoutUser_sessionsInput, UserUncheckedUpdateWithoutUser_sessionsInput>
    create: XOR<UserCreateWithoutUser_sessionsInput, UserUncheckedCreateWithoutUser_sessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUser_sessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUser_sessionsInput, UserUncheckedUpdateWithoutUser_sessionsInput>
  }

  export type UserUpdateWithoutUser_sessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUser_sessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutApi_keysInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutApi_keysInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutApi_keysInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutApi_keysInput, UserUncheckedCreateWithoutApi_keysInput>
  }

  export type UserUpsertWithoutApi_keysInput = {
    update: XOR<UserUpdateWithoutApi_keysInput, UserUncheckedUpdateWithoutApi_keysInput>
    create: XOR<UserCreateWithoutApi_keysInput, UserUncheckedCreateWithoutApi_keysInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutApi_keysInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutApi_keysInput, UserUncheckedUpdateWithoutApi_keysInput>
  }

  export type UserUpdateWithoutApi_keysInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutApi_keysInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type RepositoryCreateWithoutProjectInput = {
    id?: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description?: string | null
    clone_url: string
    ssh_url: string
    default_branch?: string
    is_private?: boolean
    webhook_id?: number | null
    webhook_secret?: string | null
    last_sync_at?: Date | string | null
    sync_status?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type RepositoryUncheckedCreateWithoutProjectInput = {
    id?: string
    github_id: number
    full_name: string
    name: string
    owner: string
    description?: string | null
    clone_url: string
    ssh_url: string
    default_branch?: string
    is_private?: boolean
    webhook_id?: number | null
    webhook_secret?: string | null
    last_sync_at?: Date | string | null
    sync_status?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type RepositoryCreateOrConnectWithoutProjectInput = {
    where: RepositoryWhereUniqueInput
    create: XOR<RepositoryCreateWithoutProjectInput, RepositoryUncheckedCreateWithoutProjectInput>
  }

  export type ProjectMemberCreateWithoutProjectInput = {
    id?: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
    user: UserCreateNestedOneWithoutProject_membersInput
  }

  export type ProjectMemberUncheckedCreateWithoutProjectInput = {
    id?: string
    user_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberCreateOrConnectWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    create: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput>
  }

  export type ProjectMemberCreateManyProjectInputEnvelope = {
    data: ProjectMemberCreateManyProjectInput | ProjectMemberCreateManyProjectInput[]
    skipDuplicates?: boolean
  }

  export type DocumentCreateWithoutProjectInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    creator: UserCreateNestedOneWithoutDocumentsInput
    versions?: DocumentVersionCreateNestedManyWithoutDocumentInput
  }

  export type DocumentUncheckedCreateWithoutProjectInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by: string
    created_at?: Date | string
    updated_at?: Date | string
    versions?: DocumentVersionUncheckedCreateNestedManyWithoutDocumentInput
  }

  export type DocumentCreateOrConnectWithoutProjectInput = {
    where: DocumentWhereUniqueInput
    create: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput>
  }

  export type DocumentCreateManyProjectInputEnvelope = {
    data: DocumentCreateManyProjectInput | DocumentCreateManyProjectInput[]
    skipDuplicates?: boolean
  }

  export type AiRequestCreateWithoutProjectInput = {
    id?: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    user: UserCreateNestedOneWithoutAi_requestsInput
    responses?: AiResponseCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUncheckedCreateWithoutProjectInput = {
    id?: string
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    responses?: AiResponseUncheckedCreateNestedManyWithoutRequestInput
    usage?: UsageTrackingUncheckedCreateNestedManyWithoutRequestInput
  }

  export type AiRequestCreateOrConnectWithoutProjectInput = {
    where: AiRequestWhereUniqueInput
    create: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput>
  }

  export type AiRequestCreateManyProjectInputEnvelope = {
    data: AiRequestCreateManyProjectInput | AiRequestCreateManyProjectInput[]
    skipDuplicates?: boolean
  }

  export type RepositoryUpsertWithoutProjectInput = {
    update: XOR<RepositoryUpdateWithoutProjectInput, RepositoryUncheckedUpdateWithoutProjectInput>
    create: XOR<RepositoryCreateWithoutProjectInput, RepositoryUncheckedCreateWithoutProjectInput>
    where?: RepositoryWhereInput
  }

  export type RepositoryUpdateToOneWithWhereWithoutProjectInput = {
    where?: RepositoryWhereInput
    data: XOR<RepositoryUpdateWithoutProjectInput, RepositoryUncheckedUpdateWithoutProjectInput>
  }

  export type RepositoryUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RepositoryUncheckedUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    full_name?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    owner?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    clone_url?: StringFieldUpdateOperationsInput | string
    ssh_url?: StringFieldUpdateOperationsInput | string
    default_branch?: StringFieldUpdateOperationsInput | string
    is_private?: BoolFieldUpdateOperationsInput | boolean
    webhook_id?: NullableIntFieldUpdateOperationsInput | number | null
    webhook_secret?: NullableStringFieldUpdateOperationsInput | string | null
    last_sync_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sync_status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUpsertWithWhereUniqueWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    update: XOR<ProjectMemberUpdateWithoutProjectInput, ProjectMemberUncheckedUpdateWithoutProjectInput>
    create: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput>
  }

  export type ProjectMemberUpdateWithWhereUniqueWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    data: XOR<ProjectMemberUpdateWithoutProjectInput, ProjectMemberUncheckedUpdateWithoutProjectInput>
  }

  export type ProjectMemberUpdateManyWithWhereWithoutProjectInput = {
    where: ProjectMemberScalarWhereInput
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyWithoutProjectInput>
  }

  export type DocumentUpsertWithWhereUniqueWithoutProjectInput = {
    where: DocumentWhereUniqueInput
    update: XOR<DocumentUpdateWithoutProjectInput, DocumentUncheckedUpdateWithoutProjectInput>
    create: XOR<DocumentCreateWithoutProjectInput, DocumentUncheckedCreateWithoutProjectInput>
  }

  export type DocumentUpdateWithWhereUniqueWithoutProjectInput = {
    where: DocumentWhereUniqueInput
    data: XOR<DocumentUpdateWithoutProjectInput, DocumentUncheckedUpdateWithoutProjectInput>
  }

  export type DocumentUpdateManyWithWhereWithoutProjectInput = {
    where: DocumentScalarWhereInput
    data: XOR<DocumentUpdateManyMutationInput, DocumentUncheckedUpdateManyWithoutProjectInput>
  }

  export type AiRequestUpsertWithWhereUniqueWithoutProjectInput = {
    where: AiRequestWhereUniqueInput
    update: XOR<AiRequestUpdateWithoutProjectInput, AiRequestUncheckedUpdateWithoutProjectInput>
    create: XOR<AiRequestCreateWithoutProjectInput, AiRequestUncheckedCreateWithoutProjectInput>
  }

  export type AiRequestUpdateWithWhereUniqueWithoutProjectInput = {
    where: AiRequestWhereUniqueInput
    data: XOR<AiRequestUpdateWithoutProjectInput, AiRequestUncheckedUpdateWithoutProjectInput>
  }

  export type AiRequestUpdateManyWithWhereWithoutProjectInput = {
    where: AiRequestScalarWhereInput
    data: XOR<AiRequestUpdateManyMutationInput, AiRequestUncheckedUpdateManyWithoutProjectInput>
  }

  export type ProjectCreateWithoutProject_membersInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    repository?: RepositoryCreateNestedOneWithoutProjectInput
    documents?: DocumentCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateWithoutProject_membersInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    repository_id?: string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    documents?: DocumentUncheckedCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectCreateOrConnectWithoutProject_membersInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutProject_membersInput, ProjectUncheckedCreateWithoutProject_membersInput>
  }

  export type UserCreateWithoutProject_membersInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutProject_membersInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutProject_membersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProject_membersInput, UserUncheckedCreateWithoutProject_membersInput>
  }

  export type ProjectUpsertWithoutProject_membersInput = {
    update: XOR<ProjectUpdateWithoutProject_membersInput, ProjectUncheckedUpdateWithoutProject_membersInput>
    create: XOR<ProjectCreateWithoutProject_membersInput, ProjectUncheckedCreateWithoutProject_membersInput>
    where?: ProjectWhereInput
  }

  export type ProjectUpdateToOneWithWhereWithoutProject_membersInput = {
    where?: ProjectWhereInput
    data: XOR<ProjectUpdateWithoutProject_membersInput, ProjectUncheckedUpdateWithoutProject_membersInput>
  }

  export type ProjectUpdateWithoutProject_membersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    repository?: RepositoryUpdateOneWithoutProjectNestedInput
    documents?: DocumentUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateWithoutProject_membersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    repository_id?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    documents?: DocumentUncheckedUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type UserUpsertWithoutProject_membersInput = {
    update: XOR<UserUpdateWithoutProject_membersInput, UserUncheckedUpdateWithoutProject_membersInput>
    create: XOR<UserCreateWithoutProject_membersInput, UserUncheckedCreateWithoutProject_membersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProject_membersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProject_membersInput, UserUncheckedUpdateWithoutProject_membersInput>
  }

  export type UserUpdateWithoutProject_membersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProject_membersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type ProjectCreateWithoutRepositoryInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    project_members?: ProjectMemberCreateNestedManyWithoutProjectInput
    documents?: DocumentCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateWithoutRepositoryInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
    documents?: DocumentUncheckedCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectCreateOrConnectWithoutRepositoryInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
  }

  export type ProjectUpsertWithoutRepositoryInput = {
    update: XOR<ProjectUpdateWithoutRepositoryInput, ProjectUncheckedUpdateWithoutRepositoryInput>
    create: XOR<ProjectCreateWithoutRepositoryInput, ProjectUncheckedCreateWithoutRepositoryInput>
    where?: ProjectWhereInput
  }

  export type ProjectUpdateToOneWithWhereWithoutRepositoryInput = {
    where?: ProjectWhereInput
    data: XOR<ProjectUpdateWithoutRepositoryInput, ProjectUncheckedUpdateWithoutRepositoryInput>
  }

  export type ProjectUpdateWithoutRepositoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project_members?: ProjectMemberUpdateManyWithoutProjectNestedInput
    documents?: DocumentUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateWithoutRepositoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project_members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type ProjectCreateWithoutDocumentsInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    repository?: RepositoryCreateNestedOneWithoutProjectInput
    project_members?: ProjectMemberCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateWithoutDocumentsInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    repository_id?: string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectCreateOrConnectWithoutDocumentsInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutDocumentsInput, ProjectUncheckedCreateWithoutDocumentsInput>
  }

  export type UserCreateWithoutDocumentsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutDocumentsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutDocumentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
  }

  export type DocumentVersionCreateWithoutDocumentInput = {
    id?: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_at?: Date | string
    creator: UserCreateNestedOneWithoutDocument_versionsInput
  }

  export type DocumentVersionUncheckedCreateWithoutDocumentInput = {
    id?: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_by: string
    created_at?: Date | string
  }

  export type DocumentVersionCreateOrConnectWithoutDocumentInput = {
    where: DocumentVersionWhereUniqueInput
    create: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput>
  }

  export type DocumentVersionCreateManyDocumentInputEnvelope = {
    data: DocumentVersionCreateManyDocumentInput | DocumentVersionCreateManyDocumentInput[]
    skipDuplicates?: boolean
  }

  export type ProjectUpsertWithoutDocumentsInput = {
    update: XOR<ProjectUpdateWithoutDocumentsInput, ProjectUncheckedUpdateWithoutDocumentsInput>
    create: XOR<ProjectCreateWithoutDocumentsInput, ProjectUncheckedCreateWithoutDocumentsInput>
    where?: ProjectWhereInput
  }

  export type ProjectUpdateToOneWithWhereWithoutDocumentsInput = {
    where?: ProjectWhereInput
    data: XOR<ProjectUpdateWithoutDocumentsInput, ProjectUncheckedUpdateWithoutDocumentsInput>
  }

  export type ProjectUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    repository?: RepositoryUpdateOneWithoutProjectNestedInput
    project_members?: ProjectMemberUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    repository_id?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project_members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type UserUpsertWithoutDocumentsInput = {
    update: XOR<UserUpdateWithoutDocumentsInput, UserUncheckedUpdateWithoutDocumentsInput>
    create: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutDocumentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutDocumentsInput, UserUncheckedUpdateWithoutDocumentsInput>
  }

  export type UserUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type DocumentVersionUpsertWithWhereUniqueWithoutDocumentInput = {
    where: DocumentVersionWhereUniqueInput
    update: XOR<DocumentVersionUpdateWithoutDocumentInput, DocumentVersionUncheckedUpdateWithoutDocumentInput>
    create: XOR<DocumentVersionCreateWithoutDocumentInput, DocumentVersionUncheckedCreateWithoutDocumentInput>
  }

  export type DocumentVersionUpdateWithWhereUniqueWithoutDocumentInput = {
    where: DocumentVersionWhereUniqueInput
    data: XOR<DocumentVersionUpdateWithoutDocumentInput, DocumentVersionUncheckedUpdateWithoutDocumentInput>
  }

  export type DocumentVersionUpdateManyWithWhereWithoutDocumentInput = {
    where: DocumentVersionScalarWhereInput
    data: XOR<DocumentVersionUpdateManyMutationInput, DocumentVersionUncheckedUpdateManyWithoutDocumentInput>
  }

  export type DocumentCreateWithoutVersionsInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
    project: ProjectCreateNestedOneWithoutDocumentsInput
    creator: UserCreateNestedOneWithoutDocumentsInput
  }

  export type DocumentUncheckedCreateWithoutVersionsInput = {
    id?: string
    project_id: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type DocumentCreateOrConnectWithoutVersionsInput = {
    where: DocumentWhereUniqueInput
    create: XOR<DocumentCreateWithoutVersionsInput, DocumentUncheckedCreateWithoutVersionsInput>
  }

  export type UserCreateWithoutDocument_versionsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutDocument_versionsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    ai_requests?: AiRequestUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutDocument_versionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutDocument_versionsInput, UserUncheckedCreateWithoutDocument_versionsInput>
  }

  export type DocumentUpsertWithoutVersionsInput = {
    update: XOR<DocumentUpdateWithoutVersionsInput, DocumentUncheckedUpdateWithoutVersionsInput>
    create: XOR<DocumentCreateWithoutVersionsInput, DocumentUncheckedCreateWithoutVersionsInput>
    where?: DocumentWhereInput
  }

  export type DocumentUpdateToOneWithWhereWithoutVersionsInput = {
    where?: DocumentWhereInput
    data: XOR<DocumentUpdateWithoutVersionsInput, DocumentUncheckedUpdateWithoutVersionsInput>
  }

  export type DocumentUpdateWithoutVersionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutDocumentsNestedInput
    creator?: UserUpdateOneRequiredWithoutDocumentsNestedInput
  }

  export type DocumentUncheckedUpdateWithoutVersionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUpsertWithoutDocument_versionsInput = {
    update: XOR<UserUpdateWithoutDocument_versionsInput, UserUncheckedUpdateWithoutDocument_versionsInput>
    create: XOR<UserCreateWithoutDocument_versionsInput, UserUncheckedCreateWithoutDocument_versionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutDocument_versionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutDocument_versionsInput, UserUncheckedUpdateWithoutDocument_versionsInput>
  }

  export type UserUpdateWithoutDocument_versionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutDocument_versionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    ai_requests?: AiRequestUncheckedUpdateManyWithoutUserNestedInput
  }

  export type ProjectCreateWithoutAi_requestsInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    repository?: RepositoryCreateNestedOneWithoutProjectInput
    project_members?: ProjectMemberCreateNestedManyWithoutProjectInput
    documents?: DocumentCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateWithoutAi_requestsInput = {
    id?: string
    name: string
    description?: string | null
    status?: $Enums.ProjectStatus
    repository_id?: string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: string
    ai_budget?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
    updated_at?: Date | string
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
    documents?: DocumentUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectCreateOrConnectWithoutAi_requestsInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutAi_requestsInput, ProjectUncheckedCreateWithoutAi_requestsInput>
  }

  export type UserCreateWithoutAi_requestsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberCreateNestedManyWithoutUserInput
    documents?: DocumentCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionCreateNestedManyWithoutCreatorInput
  }

  export type UserUncheckedCreateWithoutAi_requestsInput = {
    id?: string
    email: string
    github_id: number
    github_username: string
    name: string
    avatar_url?: string | null
    bio?: string | null
    company?: string | null
    location?: string | null
    timezone?: string
    locale?: string
    first_login_at?: Date | string | null
    last_login_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
    user_sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    api_keys?: ApiKeyUncheckedCreateNestedManyWithoutUserInput
    project_members?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    documents?: DocumentUncheckedCreateNestedManyWithoutCreatorInput
    document_versions?: DocumentVersionUncheckedCreateNestedManyWithoutCreatorInput
  }

  export type UserCreateOrConnectWithoutAi_requestsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAi_requestsInput, UserUncheckedCreateWithoutAi_requestsInput>
  }

  export type AiResponseCreateWithoutRequestInput = {
    id?: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
  }

  export type AiResponseUncheckedCreateWithoutRequestInput = {
    id?: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
  }

  export type AiResponseCreateOrConnectWithoutRequestInput = {
    where: AiResponseWhereUniqueInput
    create: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput>
  }

  export type AiResponseCreateManyRequestInputEnvelope = {
    data: AiResponseCreateManyRequestInput | AiResponseCreateManyRequestInput[]
    skipDuplicates?: boolean
  }

  export type UsageTrackingCreateWithoutRequestInput = {
    id?: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
  }

  export type UsageTrackingUncheckedCreateWithoutRequestInput = {
    id?: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
  }

  export type UsageTrackingCreateOrConnectWithoutRequestInput = {
    where: UsageTrackingWhereUniqueInput
    create: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput>
  }

  export type UsageTrackingCreateManyRequestInputEnvelope = {
    data: UsageTrackingCreateManyRequestInput | UsageTrackingCreateManyRequestInput[]
    skipDuplicates?: boolean
  }

  export type ProjectUpsertWithoutAi_requestsInput = {
    update: XOR<ProjectUpdateWithoutAi_requestsInput, ProjectUncheckedUpdateWithoutAi_requestsInput>
    create: XOR<ProjectCreateWithoutAi_requestsInput, ProjectUncheckedCreateWithoutAi_requestsInput>
    where?: ProjectWhereInput
  }

  export type ProjectUpdateToOneWithWhereWithoutAi_requestsInput = {
    where?: ProjectWhereInput
    data: XOR<ProjectUpdateWithoutAi_requestsInput, ProjectUncheckedUpdateWithoutAi_requestsInput>
  }

  export type ProjectUpdateWithoutAi_requestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    repository?: RepositoryUpdateOneWithoutProjectNestedInput
    project_members?: ProjectMemberUpdateManyWithoutProjectNestedInput
    documents?: DocumentUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateWithoutAi_requestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumProjectStatusFieldUpdateOperationsInput | $Enums.ProjectStatus
    repository_id?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: JsonNullValueInput | InputJsonValue
    ai_model?: StringFieldUpdateOperationsInput | string
    ai_budget?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project_members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type UserUpsertWithoutAi_requestsInput = {
    update: XOR<UserUpdateWithoutAi_requestsInput, UserUncheckedUpdateWithoutAi_requestsInput>
    create: XOR<UserCreateWithoutAi_requestsInput, UserUncheckedCreateWithoutAi_requestsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAi_requestsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAi_requestsInput, UserUncheckedUpdateWithoutAi_requestsInput>
  }

  export type UserUpdateWithoutAi_requestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUpdateManyWithoutUserNestedInput
    documents?: DocumentUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUpdateManyWithoutCreatorNestedInput
  }

  export type UserUncheckedUpdateWithoutAi_requestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    github_id?: IntFieldUpdateOperationsInput | number
    github_username?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    company?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    locale?: StringFieldUpdateOperationsInput | string
    first_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    last_login_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user_sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    api_keys?: ApiKeyUncheckedUpdateManyWithoutUserNestedInput
    project_members?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    documents?: DocumentUncheckedUpdateManyWithoutCreatorNestedInput
    document_versions?: DocumentVersionUncheckedUpdateManyWithoutCreatorNestedInput
  }

  export type AiResponseUpsertWithWhereUniqueWithoutRequestInput = {
    where: AiResponseWhereUniqueInput
    update: XOR<AiResponseUpdateWithoutRequestInput, AiResponseUncheckedUpdateWithoutRequestInput>
    create: XOR<AiResponseCreateWithoutRequestInput, AiResponseUncheckedCreateWithoutRequestInput>
  }

  export type AiResponseUpdateWithWhereUniqueWithoutRequestInput = {
    where: AiResponseWhereUniqueInput
    data: XOR<AiResponseUpdateWithoutRequestInput, AiResponseUncheckedUpdateWithoutRequestInput>
  }

  export type AiResponseUpdateManyWithWhereWithoutRequestInput = {
    where: AiResponseScalarWhereInput
    data: XOR<AiResponseUpdateManyMutationInput, AiResponseUncheckedUpdateManyWithoutRequestInput>
  }

  export type AiResponseScalarWhereInput = {
    AND?: AiResponseScalarWhereInput | AiResponseScalarWhereInput[]
    OR?: AiResponseScalarWhereInput[]
    NOT?: AiResponseScalarWhereInput | AiResponseScalarWhereInput[]
    id?: UuidFilter<"AiResponse"> | string
    request_id?: UuidFilter<"AiResponse"> | string
    content?: StringFilter<"AiResponse"> | string
    tokens_used?: IntFilter<"AiResponse"> | number
    model?: StringFilter<"AiResponse"> | string
    finish_reason?: StringNullableFilter<"AiResponse"> | string | null
    metadata?: JsonFilter<"AiResponse">
    created_at?: DateTimeFilter<"AiResponse"> | Date | string
  }

  export type UsageTrackingUpsertWithWhereUniqueWithoutRequestInput = {
    where: UsageTrackingWhereUniqueInput
    update: XOR<UsageTrackingUpdateWithoutRequestInput, UsageTrackingUncheckedUpdateWithoutRequestInput>
    create: XOR<UsageTrackingCreateWithoutRequestInput, UsageTrackingUncheckedCreateWithoutRequestInput>
  }

  export type UsageTrackingUpdateWithWhereUniqueWithoutRequestInput = {
    where: UsageTrackingWhereUniqueInput
    data: XOR<UsageTrackingUpdateWithoutRequestInput, UsageTrackingUncheckedUpdateWithoutRequestInput>
  }

  export type UsageTrackingUpdateManyWithWhereWithoutRequestInput = {
    where: UsageTrackingScalarWhereInput
    data: XOR<UsageTrackingUpdateManyMutationInput, UsageTrackingUncheckedUpdateManyWithoutRequestInput>
  }

  export type UsageTrackingScalarWhereInput = {
    AND?: UsageTrackingScalarWhereInput | UsageTrackingScalarWhereInput[]
    OR?: UsageTrackingScalarWhereInput[]
    NOT?: UsageTrackingScalarWhereInput | UsageTrackingScalarWhereInput[]
    id?: UuidFilter<"UsageTracking"> | string
    request_id?: UuidFilter<"UsageTracking"> | string
    model?: StringFilter<"UsageTracking"> | string
    prompt_tokens?: IntFilter<"UsageTracking"> | number
    completion_tokens?: IntFilter<"UsageTracking"> | number
    total_tokens?: IntFilter<"UsageTracking"> | number
    cost_estimate?: DecimalNullableFilter<"UsageTracking"> | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFilter<"UsageTracking"> | Date | string
  }

  export type AiRequestCreateWithoutResponsesInput = {
    id?: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectCreateNestedOneWithoutAi_requestsInput
    user: UserCreateNestedOneWithoutAi_requestsInput
    usage?: UsageTrackingCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUncheckedCreateWithoutResponsesInput = {
    id?: string
    project_id?: string | null
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    usage?: UsageTrackingUncheckedCreateNestedManyWithoutRequestInput
  }

  export type AiRequestCreateOrConnectWithoutResponsesInput = {
    where: AiRequestWhereUniqueInput
    create: XOR<AiRequestCreateWithoutResponsesInput, AiRequestUncheckedCreateWithoutResponsesInput>
  }

  export type AiRequestUpsertWithoutResponsesInput = {
    update: XOR<AiRequestUpdateWithoutResponsesInput, AiRequestUncheckedUpdateWithoutResponsesInput>
    create: XOR<AiRequestCreateWithoutResponsesInput, AiRequestUncheckedCreateWithoutResponsesInput>
    where?: AiRequestWhereInput
  }

  export type AiRequestUpdateToOneWithWhereWithoutResponsesInput = {
    where?: AiRequestWhereInput
    data: XOR<AiRequestUpdateWithoutResponsesInput, AiRequestUncheckedUpdateWithoutResponsesInput>
  }

  export type AiRequestUpdateWithoutResponsesInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneWithoutAi_requestsNestedInput
    user?: UserUpdateOneRequiredWithoutAi_requestsNestedInput
    usage?: UsageTrackingUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateWithoutResponsesInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    usage?: UsageTrackingUncheckedUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestCreateWithoutUsageInput = {
    id?: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    project?: ProjectCreateNestedOneWithoutAi_requestsInput
    user: UserCreateNestedOneWithoutAi_requestsInput
    responses?: AiResponseCreateNestedManyWithoutRequestInput
  }

  export type AiRequestUncheckedCreateWithoutUsageInput = {
    id?: string
    project_id?: string | null
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
    responses?: AiResponseUncheckedCreateNestedManyWithoutRequestInput
  }

  export type AiRequestCreateOrConnectWithoutUsageInput = {
    where: AiRequestWhereUniqueInput
    create: XOR<AiRequestCreateWithoutUsageInput, AiRequestUncheckedCreateWithoutUsageInput>
  }

  export type AiRequestUpsertWithoutUsageInput = {
    update: XOR<AiRequestUpdateWithoutUsageInput, AiRequestUncheckedUpdateWithoutUsageInput>
    create: XOR<AiRequestCreateWithoutUsageInput, AiRequestUncheckedCreateWithoutUsageInput>
    where?: AiRequestWhereInput
  }

  export type AiRequestUpdateToOneWithWhereWithoutUsageInput = {
    where?: AiRequestWhereInput
    data: XOR<AiRequestUpdateWithoutUsageInput, AiRequestUncheckedUpdateWithoutUsageInput>
  }

  export type AiRequestUpdateWithoutUsageInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneWithoutAi_requestsNestedInput
    user?: UserUpdateOneRequiredWithoutAi_requestsNestedInput
    responses?: AiResponseUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateWithoutUsageInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    responses?: AiResponseUncheckedUpdateManyWithoutRequestNestedInput
  }

  export type UserSessionCreateManyUserInput = {
    id?: string
    session_id: string
    access_token: string
    refresh_token?: string | null
    expires_at: Date | string
    ip_address?: string | null
    user_agent?: string | null
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ApiKeyCreateManyUserInput = {
    id?: string
    name: string
    key_hash: string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: Date | string | null
    expires_at?: Date | string | null
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberCreateManyUserInput = {
    id?: string
    project_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type DocumentCreateManyCreatorInput = {
    id?: string
    project_id: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type DocumentVersionCreateManyCreatorInput = {
    id?: string
    document_id: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_at?: Date | string
  }

  export type AiRequestCreateManyUserInput = {
    id?: string
    project_id?: string | null
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type UserSessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    session_id?: StringFieldUpdateOperationsInput | string
    access_token?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: DateTimeFieldUpdateOperationsInput | Date | string
    ip_address?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiKeyUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    key_hash?: StringFieldUpdateOperationsInput | string
    permissions?: JsonNullValueInput | InputJsonValue
    last_used_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutProject_membersNestedInput
  }

  export type ProjectMemberUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutDocumentsNestedInput
    versions?: DocumentVersionUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentUncheckedUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    versions?: DocumentVersionUncheckedUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentUncheckedUpdateManyWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    document?: DocumentUpdateOneRequiredWithoutVersionsNestedInput
  }

  export type DocumentVersionUncheckedUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    document_id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionUncheckedUpdateManyWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    document_id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiRequestUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneWithoutAi_requestsNestedInput
    responses?: AiResponseUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    responses?: AiResponseUncheckedUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUncheckedUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    project_id?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateManyProjectInput = {
    id?: string
    user_id: string
    role?: $Enums.MemberRole
    joined_at?: Date | string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type DocumentCreateManyProjectInput = {
    id?: string
    title: string
    description?: string | null
    type: $Enums.DocumentType
    status?: $Enums.DocumentStatus
    file_path?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type AiRequestCreateManyProjectInput = {
    id?: string
    user_id: string
    type: $Enums.AiRequestType
    status?: $Enums.AiRequestStatus
    prompt: string
    context?: JsonNullValueInput | InputJsonValue
    model?: string
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type ProjectMemberUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProject_membersNestedInput
  }

  export type ProjectMemberUncheckedUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    role?: EnumMemberRoleFieldUpdateOperationsInput | $Enums.MemberRole
    joined_at?: DateTimeFieldUpdateOperationsInput | Date | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    creator?: UserUpdateOneRequiredWithoutDocumentsNestedInput
    versions?: DocumentVersionUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentUncheckedUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    versions?: DocumentVersionUncheckedUpdateManyWithoutDocumentNestedInput
  }

  export type DocumentUncheckedUpdateManyWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumDocumentTypeFieldUpdateOperationsInput | $Enums.DocumentType
    status?: EnumDocumentStatusFieldUpdateOperationsInput | $Enums.DocumentStatus
    file_path?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiRequestUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAi_requestsNestedInput
    responses?: AiResponseUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    responses?: AiResponseUncheckedUpdateManyWithoutRequestNestedInput
    usage?: UsageTrackingUncheckedUpdateManyWithoutRequestNestedInput
  }

  export type AiRequestUncheckedUpdateManyWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    user_id?: StringFieldUpdateOperationsInput | string
    type?: EnumAiRequestTypeFieldUpdateOperationsInput | $Enums.AiRequestType
    status?: EnumAiRequestStatusFieldUpdateOperationsInput | $Enums.AiRequestStatus
    prompt?: StringFieldUpdateOperationsInput | string
    context?: JsonNullValueInput | InputJsonValue
    model?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionCreateManyDocumentInput = {
    id?: string
    version: number
    content: string
    diff_from_previous?: string | null
    commit_hash?: string | null
    created_by: string
    created_at?: Date | string
  }

  export type DocumentVersionUpdateWithoutDocumentInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    creator?: UserUpdateOneRequiredWithoutDocument_versionsNestedInput
  }

  export type DocumentVersionUncheckedUpdateWithoutDocumentInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentVersionUncheckedUpdateManyWithoutDocumentInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    diff_from_previous?: NullableStringFieldUpdateOperationsInput | string | null
    commit_hash?: NullableStringFieldUpdateOperationsInput | string | null
    created_by?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseCreateManyRequestInput = {
    id?: string
    content: string
    tokens_used: number
    model: string
    finish_reason?: string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: Date | string
  }

  export type UsageTrackingCreateManyRequestInput = {
    id?: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_estimate?: Decimal | DecimalJsLike | number | string | null
    created_at?: Date | string
  }

  export type AiResponseUpdateWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseUncheckedUpdateWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AiResponseUncheckedUpdateManyWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    tokens_used?: IntFieldUpdateOperationsInput | number
    model?: StringFieldUpdateOperationsInput | string
    finish_reason?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: JsonNullValueInput | InputJsonValue
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingUpdateWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingUncheckedUpdateWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageTrackingUncheckedUpdateManyWithoutRequestInput = {
    id?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    prompt_tokens?: IntFieldUpdateOperationsInput | number
    completion_tokens?: IntFieldUpdateOperationsInput | number
    total_tokens?: IntFieldUpdateOperationsInput | number
    cost_estimate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}