package io.spiralhouse.cycletime.infrastructure.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.spiralhouse.cycletime.infrastructure.logging.ExceptionLogger
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

// Table imports for schema creation
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueLabelsTable
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable

class DatabaseConfig(
    private val jdbcUrl: String = "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE",
    private val driver: String = "org.h2.Driver",
    /**
     * Maximum number of connections in the HikariCP connection pool.
     * 
     * ## Sizing Guidelines
     * 
     * **Formula**: connections = (core_count * 2) + effective_spindle_count
     * - For SSDs: effective_spindle_count = 1
     * - For spinning disks: effective_spindle_count = number of disks
     * 
     * **Examples**:
     * - 4-core CPU with SSD: (4 * 2) + 1 = 9 connections
     * - 8-core CPU with SSD: (8 * 2) + 1 = 17 connections
     * 
     * **Production Recommendations**:
     * - Web applications: 20-30 connections typically sufficient
     * - Batch processing: May need 50-100+ based on workload
     * - Microservices: 10-20 connections (lower due to distributed nature)
     * 
     * **Monitoring Considerations**:
     * - Track pool exhaustion events (when all connections are in use)
     * - Monitor average connection acquisition time
     * - Set alerts for connection leak detection (connections not returned)
     * - Use HikariCP metrics: pending requests, active connections, idle connections
     * 
     * **H2 Specific Notes**:
     * - H2 embedded mode: Lower pool size needed (5-10) as no network overhead
     * - H2 server mode: Follow standard sizing guidelines
     * - File-based H2: Consider disk I/O limitations when sizing
     * 
     * Current default (10) is suitable for development and small deployments.
     */
    private val maxPoolSize: Int = 10,
    /**
     * Minimum number of connections in the HikariCP connection pool.
     * 
     * **Guidelines**:
     * - Keep this low for development (2) to avoid holding unused connections
     * - For production, set to expected baseline load (typically 20-30% of maxPoolSize)
     * - H2 embedded: Can be as low as 1-2 since there's no network overhead
     */
    private val minPoolSize: Int = 2,
    private val enableLogging: Boolean = false
) {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)
    private lateinit var dataSource: HikariDataSource

    fun connect(): Database {
        logger.info("Connecting to database: $jdbcUrl")
        
        // Validate configuration before attempting connection
        validateConfiguration()

        try {
            val hikariConfig = HikariConfig().apply {
                jdbcUrl = this@DatabaseConfig.jdbcUrl
                // Let HikariCP auto-detect the driver for H2, explicitly set for others
                if (!jdbcUrl.startsWith("jdbc:h2:")) {
                    driverClassName = driver
                }
                maximumPoolSize = maxPoolSize
                minimumIdle = minPoolSize
                isAutoCommit = false
                transactionIsolation = "TRANSACTION_SERIALIZABLE"
                
                // Connection pool timeouts for production readiness
                connectionTimeout = 30000 // 30 seconds
                idleTimeout = 600000 // 10 minutes
                maxLifetime = 1800000 // 30 minutes
                
                validate()
            }

            dataSource = HikariDataSource(hikariConfig)

            val database = Database.connect(dataSource)

            // Create tables if they don't exist
            transaction(database) {
                if (enableLogging) {
                    addLogger(StdOutSqlLogger)
                }

                try {
                    SchemaUtils.create(
                        ProjectsTable,
                        IssuesTable,
                        IssueDependenciesTable,
                        IssueLabelsTable,
                        SessionStatesTable
                    )

                    // Configure foreign keys based on database type
                    when {
                        jdbcUrl.startsWith("jdbc:h2:") -> {
                            // H2 foreign keys are enabled by default in PostgreSQL compatibility mode
                            // No additional configuration needed
                        }
                    }
                } catch (e: Exception) {
                    ExceptionLogger.logException(
                        logger,
                        e,
                        "Failed to create database schema",
                        mapOf(
                            "tables" to listOf(
                                "ProjectsTable", "IssuesTable", "IssueDependenciesTable",
                                "IssueLabelsTable", "SessionStatesTable"
                            ),
                            "jdbcUrl" to jdbcUrl
                        )
                    )
                    throw e // Re-throw to ensure proper error handling
                }
            }

            logger.info("Database connected and initialized successfully")
            return database
        } catch (e: Exception) {
            ExceptionLogger.logException(
                logger,
                e,
                "Database connection failed",
                mapOf(
                    "jdbcUrl" to jdbcUrl,
                    "driver" to driver,
                    "maxPoolSize" to maxPoolSize
                )
            )
            throw e // Re-throw for upstream handling
        }
    }

    /**
     * Validates database configuration parameters.
     * 
     * @throws IllegalArgumentException if configuration is invalid
     */
    private fun validateConfiguration() {
        // Validate JDBC URL format
        validateJdbcUrl()
        
        // Validate driver class exists (if not using auto-detection)
        validateDriverClass()
        
        // Validate connection pool parameters
        validatePoolConfiguration()
    }
    
    private fun validateJdbcUrl() {
        if (jdbcUrl.isBlank()) {
            throw IllegalArgumentException("JDBC URL cannot be blank")
        }
        
        if (!jdbcUrl.startsWith("jdbc:")) {
            throw IllegalArgumentException("JDBC URL must start with 'jdbc:'. Got: $jdbcUrl")
        }
        
        // Validate specific URL patterns
        when {
            jdbcUrl.startsWith("jdbc:h2:") -> {
                if (!jdbcUrl.matches(Regex("^jdbc:h2:(file:|mem:|tcp:|ssl:)?.*"))) {
                    throw IllegalArgumentException("Invalid H2 JDBC URL format: $jdbcUrl")
                }
            }
            jdbcUrl.startsWith("jdbc:postgresql:") -> {
                if (!jdbcUrl.matches(Regex("^jdbc:postgresql://.*"))) {
                    throw IllegalArgumentException("Invalid PostgreSQL JDBC URL format: $jdbcUrl")
                }
            }
            jdbcUrl.startsWith("jdbc:mysql:") -> {
                if (!jdbcUrl.matches(Regex("^jdbc:mysql://.*"))) {
                    throw IllegalArgumentException("Invalid MySQL JDBC URL format: $jdbcUrl")
                }
            }
            else -> {
                logger.warn("Unknown JDBC URL type, skipping detailed validation: $jdbcUrl")
            }
        }
    }
    
    private fun validateDriverClass() {
        // Skip driver validation for H2 since we use auto-detection
        if (jdbcUrl.startsWith("jdbc:h2:")) {
            return
        }
        
        try {
            Class.forName(driver)
            logger.debug("Driver class validated: $driver")
        } catch (e: ClassNotFoundException) {
            throw IllegalArgumentException("JDBC driver class not found: $driver. Ensure the driver is on the classpath.", e)
        }
    }
    
    private fun validatePoolConfiguration() {
        if (maxPoolSize <= 0) {
            throw IllegalArgumentException("maxPoolSize must be positive. Got: $maxPoolSize")
        }
        
        if (minPoolSize < 0) {
            throw IllegalArgumentException("minPoolSize cannot be negative. Got: $minPoolSize")
        }
        
        if (minPoolSize > maxPoolSize) {
            throw IllegalArgumentException("minPoolSize ($minPoolSize) cannot be greater than maxPoolSize ($maxPoolSize)")
        }
        
        // Warn about potentially problematic configurations
        if (maxPoolSize > 50) {
            logger.warn("High maxPoolSize ($maxPoolSize) may cause resource exhaustion. Consider using 10-30 for most applications.")
        }
        
        if (minPoolSize == 0 && maxPoolSize > 10) {
            logger.warn("minPoolSize is 0 with maxPoolSize $maxPoolSize. Consider setting minPoolSize to 20-30% of maxPoolSize for better performance.")
        }
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
        jdbcUrl: String = "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE",
        driver: String = "org.h2.Driver",
        maxPoolSize: Int = 10,
        minPoolSize: Int = 2,
        enableLogging: Boolean = false
    ) {
        if (database == null) {
            config = DatabaseConfig(jdbcUrl, driver, maxPoolSize, minPoolSize, enableLogging)
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
