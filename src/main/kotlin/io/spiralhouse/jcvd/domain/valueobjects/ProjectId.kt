package io.spiralhouse.jcvd.domain.valueobjects

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
@JvmInline
value class ProjectId(val value: String) {
    init {
        require(value.isNotBlank()) { "ProjectId cannot be empty" }
        require(value.length <= 100) { "ProjectId cannot exceed 100 characters" }
    }

    companion object {
        fun generate(): ProjectId = ProjectId(UUID.randomUUID().toString())

        fun fromString(value: String): ProjectId = ProjectId(value)
    }

    override fun toString(): String = value
}
