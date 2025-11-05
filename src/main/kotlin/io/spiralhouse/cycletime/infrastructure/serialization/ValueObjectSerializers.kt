package io.spiralhouse.cycletime.infrastructure.serialization

import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/**
 * Custom serializer for ProjectId that ensures string serialization.
 *
 * Serializes ProjectId as a simple string (the UUID value) instead of a JSON object.
 * This fixes JSON serialization issues where value objects were being serialized as
 * objects with "_value" fields instead of primitive strings.
 *
 * Related issue: SPI-879
 */
object ProjectIdSerializer : KSerializer<ProjectId> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.spiralhouse.cycletime.domain.valueobjects.ProjectId", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: ProjectId) {
        encoder.encodeString(value.value)
    }

    override fun deserialize(decoder: Decoder): ProjectId {
        return ProjectId.fromString(decoder.decodeString())
    }
}

/**
 * Custom serializer for IssueId that ensures string serialization.
 *
 * Serializes IssueId as a simple string (the UUID value) instead of a JSON object.
 */
object IssueIdSerializer : KSerializer<IssueId> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.spiralhouse.cycletime.domain.valueobjects.IssueId", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: IssueId) {
        encoder.encodeString(value.value)
    }

    override fun deserialize(decoder: Decoder): IssueId {
        return IssueId.fromString(decoder.decodeString())
    }
}

/**
 * Custom serializer for WorkflowId that ensures string serialization.
 *
 * Serializes WorkflowId as a simple string (the UUID value) instead of a JSON object.
 */
object WorkflowIdSerializer : KSerializer<WorkflowId> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.spiralhouse.cycletime.domain.valueobjects.WorkflowId", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: WorkflowId) {
        encoder.encodeString(value.value.toString())
    }

    override fun deserialize(decoder: Decoder): WorkflowId {
        return WorkflowId.fromString(decoder.decodeString())
    }
}
