---
title: "ADR-009: Jackson 2.x and 3.x Coexistence"
type: reference
domain: [infrastructure, logging]
description: "Documents the dual Jackson version strategy for logstash-logback-encoder 9.0"
dependencies: []
related: [docs/architecture/overview.md]
keywords: [jackson, logging, logstash, graalvm]
last_updated: 2025-12-13
---

# ADR-009: Jackson 2.x and 3.x Coexistence

## Status
Accepted

## Context

PR #223 upgrades `logstash-logback-encoder` from 8.0 to 9.0. Version 9.0 migrates to Jackson 3.x (`tools.jackson.*` package namespace) while other dependencies (Swagger/OpenAPI via Ktor) continue to use Jackson 2.x (`com.fasterxml.jackson.*` namespace).

### Key Facts

- **CycleTime's JSON Strategy**: Exclusively uses `kotlinx.serialization` for all application JSON handling
- **Jackson Usage**: Only present as transitive dependencies:
  - Swagger/OpenAPI (via Ktor) → Jackson 2.x (for API documentation generation)
  - logstash-logback-encoder 9.0 → Jackson 3.x (for structured production logging)
- **No Direct Jackson Code**: Grep analysis confirmed zero Jackson imports in application source code

### Package Namespace Isolation

Jackson 3.x was deliberately designed to coexist with Jackson 2.x during migration periods:

- Jackson 2.x: `com.fasterxml.jackson.*`
- Jackson 3.x: `tools.jackson.*`

These are completely separate package namespaces with no class conflicts. Both can safely load on the same classpath.

## Decision

Accept the dual Jackson configuration (2.x and 3.x on the same classpath) because:

1. **Package Isolation**: Different namespaces prevent class conflicts
2. **Limited Scope**: Jackson only used by isolated subsystems (Swagger vs Logstash)
3. **No Application Impact**: CycleTime uses kotlinx.serialization exclusively
4. **Official Design**: Jackson 3.x deliberately supports this coexistence pattern

## Implementation

### GraalVM Native Image Support

Added reflection configuration for both Jackson versions:

**File**: `src/main/resources/META-INF/native-image/reflect-config.json`
```json
{
  "name":"net.logstash.logback.encoder.LogstashEncoder",
  "queryAllPublicMethods":true,
  "methods":[{"name":"<init>","parameterTypes":[] }]
},
{
  "name":"net.logstash.logback.stacktrace.ShortenedThrowableConverter",
  "queryAllPublicMethods":true,
  "methods":[{"name":"<init>","parameterTypes":[] }]
},
{
  "name":"tools.jackson.databind.ObjectMapper",
  "allDeclaredMethods":true,
  "allDeclaredConstructors":true
}
```

**File**: `src/main/resources/META-INF/native-image/native-image.properties`
```
Args = --no-fallback \
       --initialize-at-run-time=org.slf4j,ch.qos.logback,tools.jackson \
       --initialize-at-build-time=kotlin
```

### Integration Test Coverage

Created `ProductionLoggingIntegrationTest.kt` to verify:
- LogstashEncoder initializes correctly
- Production logging configuration loads
- Jackson 2.x available (Swagger)
- Jackson 3.x available when upgraded (Logstash 9.0+)

Test is version-aware and passes with both logstash-encoder 8.0 (Jackson 2.x only) and 9.0 (Jackson 2.x + 3.x).

## Consequences

### Positive

- Production logging gets structured JSON output via LogstashEncoder
- No application code changes required
- Both ecosystems (Swagger with Jackson 2.x, Logstash with Jackson 3.x) work correctly
- GraalVM native image compilation supported

### Negative

- Slightly larger binary size due to two Jackson versions (~2MB additional)
- Requires GraalVM reflection configuration for both Jackson versions
- Future maintainers must understand the dual-version strategy

### Mitigations

- Integration tests verify both configurations work
- GraalVM reflection config includes both Jackson 2.x and 3.x entries
- This ADR documents the decision for future reference
- Test suite validates Jackson coexistence automatically

## Future Considerations

Eventually, the ecosystem will migrate fully to Jackson 3.x:
- Ktor/Swagger libraries will adopt Jackson 3.x
- At that point, Jackson 2.x can be excluded as a dependency
- The transition will be seamless due to package namespace isolation

## References

- [Jackson 3.0 Release](https://github.com/FasterXML/jackson/wiki/Jackson-Release-3.0)
- [Jackson 3 Migration Guide](https://github.com/FasterXML/jackson/blob/main/jackson3/MIGRATING_TO_JACKSON_3.md)
- [logstash-logback-encoder 9.0 Release](https://github.com/logfellow/logstash-logback-encoder/releases/tag/logstash-logback-encoder-9.0)
- PR #223: Bump logstash-logback-encoder from 8.0 to 9.0
