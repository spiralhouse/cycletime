package io.spiralhouse.cycletime.infrastructure.persistence

/**
 * Indicates that a class is thread-safe and can be safely accessed
 * by multiple threads concurrently without external synchronization.
 * 
 * ## Contract
 * 
 * Classes annotated with @ThreadSafe guarantee:
 * - All public methods can be called concurrently
 * - Internal state (if any) is properly synchronized
 * - No data corruption will occur under concurrent access
 * - Operations maintain ACID properties when applicable
 * 
 * ## Implementation Requirements
 * 
 * To maintain thread-safety, implementations must:
 * - Use only immutable instance fields
 * - Synchronize access to any mutable state
 * - Avoid sharing mutable objects between threads
 * - Ensure all operations are atomic or properly transactional
 * 
 * ## Usage in Dependency Injection
 * 
 * Thread-safe classes are ideal candidates for singleton scope in DI
 * containers, as they can be safely shared across the application.
 * 
 * @since 1.0.0
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class ThreadSafe

/**
 * Indicates that a class is NOT thread-safe and requires external
 * synchronization for concurrent access.
 * 
 * Classes with this annotation should typically be created per-request
 * or per-thread in dependency injection configurations.
 * 
 * @since 1.0.0
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class NotThreadSafe