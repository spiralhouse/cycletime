package io.spiralhouse.cycletime.infrastructure.serialization

import kotlinx.datetime.Instant
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/**
 * Custom serializer for kotlinx.datetime.Instant that ensures ISO-8601 string serialization.
 *
 * This serializer addresses JSON serialization issues where Instant fields were being
 * serialized as JSON objects instead of primitive strings, causing test failures when
 * accessing `.jsonPrimitive` on Instant fields.
 *
 * Related issue: SPI-879
 *
 * Usage:
 * ```kotlin
 * @Serializable
 * data class MyDto(
 *     @Serializable(with = InstantSerializer::class)
 *     val createdAt: Instant,
 *     @Serializable(with = NullableInstantSerializer::class)
 *     val deletedAt: Instant? = null
 * )
 * ```
 */
object InstantSerializer : KSerializer<Instant> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("kotlinx.datetime.Instant", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Instant) {
        encoder.encodeString(value.toString())
    }

    override fun deserialize(decoder: Decoder): Instant {
        return Instant.parse(decoder.decodeString())
    }
}

/**
 * Custom serializer for nullable kotlinx.datetime.Instant that ensures ISO-8601 string serialization.
 *
 * This handles nullable Instant fields, serializing them as either an ISO-8601 string or null.
 *
 * Usage:
 * ```kotlin
 * @Serializable
 * data class MyDto(
 *     @Serializable(with = NullableInstantSerializer::class)
 *     val deletedAt: Instant? = null
 * )
 * ```
 */
object NullableInstantSerializer : KSerializer<Instant?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("kotlinx.datetime.Instant?", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Instant?) {
        if (value == null) {
            encoder.encodeNull()
        } else {
            encoder.encodeString(value.toString())
        }
    }

    override fun deserialize(decoder: Decoder): Instant? {
        return if (decoder.decodeNotNullMark()) {
            Instant.parse(decoder.decodeString())
        } else {
            decoder.decodeNull()
        }
    }
}
