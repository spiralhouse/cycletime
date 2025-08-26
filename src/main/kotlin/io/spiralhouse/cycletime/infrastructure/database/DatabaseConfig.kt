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
    private val jdbcUrl: String = "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    private val driver: String = "org.h2.Driver",
    private val maxPoolSize: Int = 10, // Suitable for development/small deployments, increase for production workloads
    private val enableLogging: Boolean = false
) {
    private val logger = LoggerFactory.getLogger(DatabaseConfig::class.java)
    private lateinit var dataSource: HikariDataSource

    fun connect(): Database {
        logger.info("Connecting to database: $jdbcUrl")

        try {
            val hikariConfig = HikariConfig().apply {
                jdbcUrl = this@DatabaseConfig.jdbcUrl
                // Let HikariCP auto-detect the driver for H2, explicitly set for others
                if (!jdbcUrl.startsWith("jdbc:h2:")) {
                    driverClassName = driver
                }
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
                        jdbcUrl.startsWith("jdbc:sqlite:") -> {
                            // Enable foreign keys for SQLite
                            connection.prepareStatement("PRAGMA foreign_keys = ON", false).executeUpdate()
                        }
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
        jdbcUrl: String = "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver: String = "org.h2.Driver",
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
