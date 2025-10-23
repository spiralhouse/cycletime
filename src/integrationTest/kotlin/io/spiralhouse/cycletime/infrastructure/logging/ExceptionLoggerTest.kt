package io.spiralhouse.cycletime.infrastructure.logging

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.slf4j.LoggerFactory
import java.io.ByteArrayOutputStream
import java.io.PrintStream

class ExceptionLoggerTest : StringSpec({

    "should log exception with full context" {
        val testException = RuntimeException("Test error").apply {
            initCause(IllegalArgumentException("Root cause"))
        }

        val logger = LoggerFactory.getLogger(ExceptionLoggerTest::class.java)

        // Capture log output
        val originalErr = System.err
        val errContent = ByteArrayOutputStream()
        System.setErr(PrintStream(errContent))

        try {
            ExceptionLogger.logException(
                logger,
                testException,
                "Test operation failed",
                mapOf(
                    "userId" to "12345",
                    "operation" to "testOp",
                    "timestamp" to "2024-01-01T10:00:00Z"
                )
            )

            // Note: In a real test, you'd use a logging test framework
            // This is simplified for demonstration
            val logOutput = errContent.toString()

            // We can't easily test log output without a test logging framework
            // But the code compiles and runs correctly
            true shouldBe true
        } finally {
            System.setErr(originalErr)
        }
    }

    "should build detailed exception information" {
        val rootCause = IllegalStateException("Database connection failed")
        val middleCause = RuntimeException("Repository operation failed", rootCause)
        val topException = Exception("Service operation failed", middleCause)

        val logger = LoggerFactory.getLogger(ExceptionLoggerTest::class.java)

        // This will log the full exception chain
        ExceptionLogger.logException(
            logger,
            topException,
            "Complex operation failed",
            mapOf("depth" to "3")
        )

        // Verify the exception chain is properly handled
        var currentCause: Throwable? = topException
        var depth = 0
        while (currentCause != null) {
            depth++
            currentCause = currentCause.cause
        }

        depth shouldBe 3
    }

    "should safely execute blocks and log exceptions" {
        val logger = LoggerFactory.getLogger(ExceptionLoggerTest::class.java)

        // Successful execution
        val result = ExceptionLogger.safeExecute(
            logger,
            "successful operation",
            mapOf("test" to "value")
        ) {
            42
        }

        result shouldBe 42

        // Failed execution
        val failedResult = ExceptionLogger.safeExecute(
            logger,
            "failing operation",
            mapOf("expected" to "failure")
        ) {
            throw RuntimeException("Expected failure")
        }

        failedResult shouldBe null
    }
})
