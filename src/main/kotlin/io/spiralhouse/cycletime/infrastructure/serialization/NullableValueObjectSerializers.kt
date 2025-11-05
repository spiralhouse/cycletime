package io.spiralhouse.cycletime.infrastructure.serialization

import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/**
 * Custom serializer for nullable ProjectId that ensures string serialization.
 *
 * Serializes nullable ProjectId as either a string (the UUID value) or null.
 */
object NullableProjectIdSerializer : KSerializer<ProjectId?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.spiralhouse.cycletime.domain.valueobjects.ProjectId?", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: ProjectId?) {
        if (value == null) {
            encoder.encodeNull()
        } else {
            encoder.encodeString(value.value)
        }
    }

    override fun deserialize(decoder: Decoder): ProjectId? {
        return if (decoder.decodeNotNullMark()) {
            ProjectId.fromString(decoder.decodeString())
        } else {
            decoder.decodeNull()
        }
    }
}

/**
 * Custom serializer for nullable IssueId that ensures string serialization.
 *
 * Serializes nullable IssueId as either a string (the UUID value) or null.
 */
object NullableIssueIdSerializer : KSerializer<IssueId?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.spiralhouse.cycletime.domain.valueobjects.IssueId?", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: IssueId?) {
        if (value == null) {
            encoder.encodeNull()
        } else {
            encoder.encodeString(value.value)
        }
    }

    override fun deserialize(decoder: Decoder): IssueId? {
        return if (decoder.decodeNotNullMark()) {
            IssueId.fromString(decoder.decodeString())
        } else {
            decoder.decodeNull()
        }
    }
}
