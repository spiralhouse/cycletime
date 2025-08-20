package io.spiralhouse.jcvd.infrastructure.di

import kotlin.reflect.KClass

/**
 * Simple dependency injection container to replace Koin.
 * 
 * This provides a lightweight DI solution using Ktor's application attributes
 * for storing and retrieving singleton instances.
 */
class DIContainer {
    private val singletons = mutableMapOf<KClass<*>, Any>()
    
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> singleton(clazz: KClass<T>, factory: () -> T): T {
        return singletons.getOrPut(clazz) { factory() } as T
    }
    
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> getInstance(clazz: KClass<T>): T {
        return singletons[clazz] as? T 
            ?: throw IllegalStateException("No binding found for ${clazz.simpleName}")
    }
}

// Extension functions for easier usage
inline fun <reified T : Any> DIContainer.singleton(noinline factory: () -> T): T {
    return singleton(T::class, factory)
}

inline fun <reified T : Any> DIContainer.getInstance(): T {
    return getInstance(T::class)
}