package io.spiralhouse.cycletime.unit

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.application.config.RetentionConfig

/**
 * Unit tests for RetentionConfig validation.
 *
 * Verifies that RetentionConfig enforces:
 * 1. Minimum retention period of 1 day (prevents accidental data loss)
 * 2. Valid ISO-8601 duration format
 * 3. Non-blank cron expression when auto-purge is enabled
 */
class RetentionConfigTest : StringSpec({

    "should accept valid default configuration" {
        val config = RetentionConfig()

        config.retentionPeriod shouldBe "P30D"
        config.enableAutoPurge shouldBe true
        config.purgeScheduleCron shouldBe "0 0 2 * * ?"
    }

    "should accept valid 1-day minimum retention period" {
        val config = RetentionConfig(retentionPeriod = "P1D")

        config.retentionPeriod shouldBe "P1D"
    }

    "should accept valid 90-day retention period" {
        val config = RetentionConfig(retentionPeriod = "P90D")

        config.retentionPeriod shouldBe "P90D"
    }

    "should reject zero-day retention period" {
        val exception = shouldThrow<IllegalArgumentException> {
            RetentionConfig(retentionPeriod = "P0D")
        }

        exception.message shouldContain "Retention period must be at least 1 day"
        exception.message shouldContain "P0D"
        exception.message shouldContain "0 days"
    }

    "should reject negative retention period" {
        val exception = shouldThrow<IllegalArgumentException> {
            RetentionConfig(retentionPeriod = "-P30D")
        }

        exception.message shouldContain "Retention period must be at least 1 day"
        exception.message shouldContain "-P30D"
    }

    "should reject invalid duration format" {
        shouldThrow<IllegalArgumentException> {
            RetentionConfig(retentionPeriod = "garbage")
        }
    }

    "should reject hours-only retention period below 1 day" {
        val exception = shouldThrow<IllegalArgumentException> {
            RetentionConfig(retentionPeriod = "PT23H")
        }

        exception.message shouldContain "Retention period must be at least 1 day"
    }

    "should accept hours-only retention period equal to or above 1 day" {
        val config = RetentionConfig(retentionPeriod = "PT24H")

        config.retentionPeriod shouldBe "PT24H"
    }

    "should reject blank cron expression when auto-purge is enabled" {
        val exception = shouldThrow<IllegalArgumentException> {
            RetentionConfig(
                enableAutoPurge = true,
                purgeScheduleCron = ""
            )
        }

        exception.message shouldContain "purgeScheduleCron cannot be blank"
        exception.message shouldContain "enableAutoPurge is true"
    }

    "should accept blank cron expression when auto-purge is disabled" {
        val config = RetentionConfig(
            enableAutoPurge = false,
            purgeScheduleCron = ""
        )

        config.enableAutoPurge shouldBe false
        config.purgeScheduleCron shouldBe ""
    }

    "should accept custom cron expression with auto-purge enabled" {
        val config = RetentionConfig(
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 3 * * ?"
        )

        config.purgeScheduleCron shouldBe "0 0 3 * * ?"
    }
})
