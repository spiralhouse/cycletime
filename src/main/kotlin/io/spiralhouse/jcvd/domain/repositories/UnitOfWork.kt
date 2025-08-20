package com.spiralhouse.jcvd.domain.repositories

interface UnitOfWork {
    suspend fun <T> execute(block: suspend () -> T): T
    suspend fun begin()
    suspend fun commit()
    suspend fun rollback()
}