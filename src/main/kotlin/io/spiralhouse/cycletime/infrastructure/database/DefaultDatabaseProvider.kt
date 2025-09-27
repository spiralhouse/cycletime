package io.spiralhouse.cycletime.infrastructure.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.spiralhouse.cycletime.infrastructure.logging.ExceptionLogger
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

/**
 * Production database provider with HikariCP connection pooling.
 *
 * This implementation replaces the DatabaseFactory singleton with a properly
 * dependency-injected database provider. It maintains a single connection pool
 * for the application lifetime with proper resource management.
 *
 * ## Key Features
 * - HikariCP connection pooling with production-ready configuration
 * - Automatic schema creation and validation
 * - Proper resource cleanup on shutdown
 * - Thread-safe initialization without synchronization overhead
 *
 * ## Configuration
 * The provider accepts a DatabaseConfig containing:
 * - JDBC URL and driver configuration
 * - Connection pool sizing (min/max connections)
 * - Optional SQL logging for debugging
 *
 * ## Lifecycle Management
 * - Created once during application startup via DI
 * - Maintains singleton connection pool for application lifetime
 * - Properly closed during graceful shutdown
 *
 * @property config Database configuration parameters
 */
class DefaultDatabaseProvider(
    private val config: DatabaseConfig
) : DatabaseProvider {

    private val logger = LoggerFactory.getLogger(DefaultDatabaseProvider::class.java)
    private val dataSource: HikariDataSource
    private val database: Database

    init {
        logger.info("Initializing database provider with URL: ${config.jdbcUrl}")

        // Validate configuration before attempting connection
        validateConfiguration()

        try {
            // Configure HikariCP with production settings
            val hikariConfig = HikariConfig().apply {
                jdbcUrl = config.jdbcUrl

                // Let HikariCP auto-detect the driver for H2, explicitly set for others
                if (!config.jdbcUrl.startsWith("jdbc:h2:")) {
                    driverClassName = config.driver
                }

                // Connection pool sizing
                maximumPoolSize = config.maxPoolSize
                minimumIdle = config.minPoolSize

                // Transaction settings
                isAutoCommit = false
                transactionIsolation = "TRANSACTION_SERIALIZABLE"

                // Connection pool timeouts for production readiness
                connectionTimeout = 30000      // 30 seconds - max wait time to get a connection from pool
                idleTimeout = 600000           // 10 minutes - how long a connection can be idle before removal
                maxLifetime = 1800000          // 30 minutes - max lifetime of a connection in the pool
                leakDetectionThreshold = 60000 // 1 minute - log connections not returned to pool
                validationTimeout = 5000       // 5 seconds - max time to validate a connection

                // Pool naming for monitoring
                poolName = "CycleTimeHikariCP"

                // Validate the configuration
                validate()
            }

            // Create data source and database connection
            dataSource = HikariDataSource(hikariConfig)
            database = Database.connect(dataSource)

            // Initialize schema
            initializeSchema()

            logger.info("Database provider initialized successfully with pool size ${config.minPoolSize}-${config.maxPoolSize}")
        } catch (e: Exception) {
            ExceptionLogger.logException(
                logger,
                e,
                "Failed to initialize database provider",
                mapOf(
                    "jdbcUrl" to config.jdbcUrl,
                    "driver" to config.driver,
                    "maxPoolSize" to config.maxPoolSize,
                    "minPoolSize" to config.minPoolSize
                )
            )
            throw IllegalStateException("Database provider initialization failed", e)
        }
    }

    /**
     * Initialize database schema using the centralized table registry.
     */
    private fun initializeSchema() {
        transaction(database) {
            if (config.enableLogging) {
                addLogger(StdOutSqlLogger)
            }

            try {
                // Validate registry first
                TableRegistry.validate()

                // Create missing tables and columns (safe for concurrent startup)
                SchemaUtils.createMissingTablesAndColumns(
                    *TableRegistry.ALL_TABLES.toTypedArray()
                )

                logger.debug("Database schema initialized with ${TableRegistry.ALL_TABLES.size} tables")
            } catch (e: Exception) {
                ExceptionLogger.logException(
                    logger,
                    e,
                    "Failed to create database schema",
                    mapOf(
                        "tables" to TableRegistry.ALL_TABLES.map { it.tableName },
                        "jdbcUrl" to config.jdbcUrl
                    )
                )
                throw e // Re-throw to ensure proper error handling
            }
        }
    }

    /**
     * Validate database configuration parameters.
     */
    private fun validateConfiguration() {
        // Validate JDBC URL
        require(config.jdbcUrl.isNotBlank()) {
            "JDBC URL cannot be blank"
        }
        require(config.jdbcUrl.startsWith("jdbc:")) {
            "JDBC URL must start with 'jdbc:'. Got: ${config.jdbcUrl}"
        }

        // Validate driver class
        if (!config.jdbcUrl.startsWith("jdbc:h2:")) {
            require(config.driver.isNotBlank()) {
                "Database driver cannot be blank"
            }
            try {
                Class.forName(config.driver)
            } catch (e: ClassNotFoundException) {
                throw IllegalArgumentException("JDBC driver class not found: ${config.driver}", e)
            }
        }

        // Validate connection pool parameters
        require(config.maxPoolSize > 0) {
            "maxPoolSize must be positive. Got: ${config.maxPoolSize}"
        }
        require(config.minPoolSize >= 0) {
            "minPoolSize cannot be negative. Got: ${config.minPoolSize}"
        }
        require(config.minPoolSize <= config.maxPoolSize) {
            "minPoolSize (${config.minPoolSize}) cannot be greater than maxPoolSize (${config.maxPoolSize})"
        }

        // Warn about potentially problematic configurations
        if (config.maxPoolSize > 50) {
            logger.warn("High maxPoolSize (${config.maxPoolSize}) may cause resource exhaustion. Consider using 10-30 for most applications.")
        }
    }

    override fun getDatabase(): Database = database

    override fun close() {
        if (!dataSource.isClosed) {
            logger.info("Closing database connections...")
            dataSource.close()
            logger.info("Database connections closed successfully")
        }
    }

    override fun isReady(): Boolean {
        return try {
            !dataSource.isClosed && dataSource.connection.use { conn ->
                conn.isValid(5) // 5 second timeout for validation
            }
        } catch (e: Exception) {
            logger.warn("Database readiness check failed: ${e.message}")
            false
        }
    }
}