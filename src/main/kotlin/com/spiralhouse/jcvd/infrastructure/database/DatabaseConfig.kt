package com.spiralhouse.jcvd.infrastructure.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

class DatabaseConfig(
    private val jdbcUrl: String = "jdbc:sqlite:jcvd.db",
    private val driver: String = "org.sqlite.JDBC",
    private val maxPoolSize: Int = 10,
    private val enableLogging: Boolean = false
) {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)
    private lateinit var dataSource: HikariDataSource
    
    fun connect(): Database {
        logger.info("Connecting to database: $jdbcUrl")
        
        val hikariConfig = HikariConfig().apply {
            jdbcUrl = this@DatabaseConfig.jdbcUrl
            driverClassName = driver
            maximumPoolSize = maxPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_SERIALIZABLE"
            validate()
        }
        
        dataSource = HikariDataSource(hikariConfig)
        
        val database = Database.connect(dataSource)
        
        // Create tables if they don't exist
        transaction(database) {
            if (enableLogging) {
                addLogger(StdOutSqlLogger)
            }
            
            SchemaUtils.create(
                ProjectsTable,
                IssuesTable,
                IssueDependenciesTable,
                IssueLabelsTable,
                SessionStatesTable
            )
            
            // Enable foreign keys for SQLite
            exec("PRAGMA foreign_keys = ON")
        }
        
        logger.info("Database connected and initialized successfully")
        return database
    }
    
    fun close() {
        if (::dataSource.isInitialized && !dataSource.isClosed) {
            dataSource.close()
            logger.info("Database connection closed")
        }
    }
    
    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}

// Singleton database instance for the application
object DatabaseFactory {
    private var database: Database? = null
    private var config: DatabaseConfig? = null
    
    fun init(
        jdbcUrl: String = "jdbc:sqlite:jcvd.db",
        driver: String = "org.sqlite.JDBC",
        maxPoolSize: Int = 10,
        enableLogging: Boolean = false
    ) {
        if (database == null) {
            config = DatabaseConfig(jdbcUrl, driver, maxPoolSize, enableLogging)
            database = config!!.connect()
        }
    }
    
    fun getInstance(): Database {
        return database ?: throw IllegalStateException("Database not initialized. Call DatabaseFactory.init() first.")
    }
    
    fun close() {
        config?.close()
        database = null
        config = null
    }
}