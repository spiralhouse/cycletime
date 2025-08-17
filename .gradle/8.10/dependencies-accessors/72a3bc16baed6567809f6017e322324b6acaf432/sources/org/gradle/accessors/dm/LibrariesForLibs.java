package org.gradle.accessors.dm;

import org.gradle.api.NonNullApi;
import org.gradle.api.artifacts.MinimalExternalModuleDependency;
import org.gradle.plugin.use.PluginDependency;
import org.gradle.api.artifacts.ExternalModuleDependencyBundle;
import org.gradle.api.artifacts.MutableVersionConstraint;
import org.gradle.api.provider.Provider;
import org.gradle.api.model.ObjectFactory;
import org.gradle.api.provider.ProviderFactory;
import org.gradle.api.internal.catalog.AbstractExternalDependencyFactory;
import org.gradle.api.internal.catalog.DefaultVersionCatalog;
import java.util.Map;
import org.gradle.api.internal.attributes.ImmutableAttributesFactory;
import org.gradle.api.internal.artifacts.dsl.CapabilityNotationParser;
import javax.inject.Inject;

/**
 * A catalog of dependencies accessible via the {@code libs} extension.
 */
@NonNullApi
public class LibrariesForLibs extends AbstractExternalDependencyFactory {

    private final AbstractExternalDependencyFactory owner = this;
    private final ExposedLibraryAccessors laccForExposedLibraryAccessors = new ExposedLibraryAccessors(owner);
    private final KoinLibraryAccessors laccForKoinLibraryAccessors = new KoinLibraryAccessors(owner);
    private final KotestLibraryAccessors laccForKotestLibraryAccessors = new KotestLibraryAccessors(owner);
    private final KotlinxLibraryAccessors laccForKotlinxLibraryAccessors = new KotlinxLibraryAccessors(owner);
    private final KtorLibraryAccessors laccForKtorLibraryAccessors = new KtorLibraryAccessors(owner);
    private final LogbackLibraryAccessors laccForLogbackLibraryAccessors = new LogbackLibraryAccessors(owner);
    private final McpLibraryAccessors laccForMcpLibraryAccessors = new McpLibraryAccessors(owner);
    private final SqliteLibraryAccessors laccForSqliteLibraryAccessors = new SqliteLibraryAccessors(owner);
    private final VersionAccessors vaccForVersionAccessors = new VersionAccessors(providers, config);
    private final BundleAccessors baccForBundleAccessors = new BundleAccessors(objects, providers, config, attributesFactory, capabilityNotationParser);
    private final PluginAccessors paccForPluginAccessors = new PluginAccessors(providers, config);

    @Inject
    public LibrariesForLibs(DefaultVersionCatalog config, ProviderFactory providers, ObjectFactory objects, ImmutableAttributesFactory attributesFactory, CapabilityNotationParser capabilityNotationParser) {
        super(config, providers, objects, attributesFactory, capabilityNotationParser);
    }

    /**
     * Dependency provider for <b>mockk</b> with <b>io.mockk:mockk</b> coordinates and
     * with version reference <b>mockk</b>
     * <p>
     * This dependency was declared in catalog libs.versions.toml
     */
    public Provider<MinimalExternalModuleDependency> getMockk() {
        return create("mockk");
    }

    /**
     * Group of libraries at <b>exposed</b>
     */
    public ExposedLibraryAccessors getExposed() {
        return laccForExposedLibraryAccessors;
    }

    /**
     * Group of libraries at <b>koin</b>
     */
    public KoinLibraryAccessors getKoin() {
        return laccForKoinLibraryAccessors;
    }

    /**
     * Group of libraries at <b>kotest</b>
     */
    public KotestLibraryAccessors getKotest() {
        return laccForKotestLibraryAccessors;
    }

    /**
     * Group of libraries at <b>kotlinx</b>
     */
    public KotlinxLibraryAccessors getKotlinx() {
        return laccForKotlinxLibraryAccessors;
    }

    /**
     * Group of libraries at <b>ktor</b>
     */
    public KtorLibraryAccessors getKtor() {
        return laccForKtorLibraryAccessors;
    }

    /**
     * Group of libraries at <b>logback</b>
     */
    public LogbackLibraryAccessors getLogback() {
        return laccForLogbackLibraryAccessors;
    }

    /**
     * Group of libraries at <b>mcp</b>
     */
    public McpLibraryAccessors getMcp() {
        return laccForMcpLibraryAccessors;
    }

    /**
     * Group of libraries at <b>sqlite</b>
     */
    public SqliteLibraryAccessors getSqlite() {
        return laccForSqliteLibraryAccessors;
    }

    /**
     * Group of versions at <b>versions</b>
     */
    public VersionAccessors getVersions() {
        return vaccForVersionAccessors;
    }

    /**
     * Group of bundles at <b>bundles</b>
     */
    public BundleAccessors getBundles() {
        return baccForBundleAccessors;
    }

    /**
     * Group of plugins at <b>plugins</b>
     */
    public PluginAccessors getPlugins() {
        return paccForPluginAccessors;
    }

    public static class ExposedLibraryAccessors extends SubDependencyFactory {
        private final ExposedKotlinLibraryAccessors laccForExposedKotlinLibraryAccessors = new ExposedKotlinLibraryAccessors(owner);

        public ExposedLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>core</b> with <b>org.jetbrains.exposed:exposed-core</b> coordinates and
         * with version reference <b>exposed</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCore() {
            return create("exposed.core");
        }

        /**
         * Dependency provider for <b>dao</b> with <b>org.jetbrains.exposed:exposed-dao</b> coordinates and
         * with version reference <b>exposed</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getDao() {
            return create("exposed.dao");
        }

        /**
         * Dependency provider for <b>jdbc</b> with <b>org.jetbrains.exposed:exposed-jdbc</b> coordinates and
         * with version reference <b>exposed</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getJdbc() {
            return create("exposed.jdbc");
        }

        /**
         * Group of libraries at <b>exposed.kotlin</b>
         */
        public ExposedKotlinLibraryAccessors getKotlin() {
            return laccForExposedKotlinLibraryAccessors;
        }

    }

    public static class ExposedKotlinLibraryAccessors extends SubDependencyFactory {

        public ExposedKotlinLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>datetime</b> with <b>org.jetbrains.exposed:exposed-kotlin-datetime</b> coordinates and
         * with version reference <b>exposed</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getDatetime() {
            return create("exposed.kotlin.datetime");
        }

    }

    public static class KoinLibraryAccessors extends SubDependencyFactory {

        public KoinLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>core</b> with <b>io.insert-koin:koin-core</b> coordinates and
         * with version reference <b>koin</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCore() {
            return create("koin.core");
        }

        /**
         * Dependency provider for <b>ktor</b> with <b>io.insert-koin:koin-ktor</b> coordinates and
         * with version reference <b>koin</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getKtor() {
            return create("koin.ktor");
        }

    }

    public static class KotestLibraryAccessors extends SubDependencyFactory {
        private final KotestAssertionsLibraryAccessors laccForKotestAssertionsLibraryAccessors = new KotestAssertionsLibraryAccessors(owner);
        private final KotestRunnerLibraryAccessors laccForKotestRunnerLibraryAccessors = new KotestRunnerLibraryAccessors(owner);

        public KotestLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>property</b> with <b>io.kotest:kotest-property</b> coordinates and
         * with version reference <b>kotest</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getProperty() {
            return create("kotest.property");
        }

        /**
         * Group of libraries at <b>kotest.assertions</b>
         */
        public KotestAssertionsLibraryAccessors getAssertions() {
            return laccForKotestAssertionsLibraryAccessors;
        }

        /**
         * Group of libraries at <b>kotest.runner</b>
         */
        public KotestRunnerLibraryAccessors getRunner() {
            return laccForKotestRunnerLibraryAccessors;
        }

    }

    public static class KotestAssertionsLibraryAccessors extends SubDependencyFactory {

        public KotestAssertionsLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>core</b> with <b>io.kotest:kotest-assertions-core</b> coordinates and
         * with version reference <b>kotest</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCore() {
            return create("kotest.assertions.core");
        }

    }

    public static class KotestRunnerLibraryAccessors extends SubDependencyFactory {

        public KotestRunnerLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>junit5</b> with <b>io.kotest:kotest-runner-junit5</b> coordinates and
         * with version reference <b>kotest</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getJunit5() {
            return create("kotest.runner.junit5");
        }

    }

    public static class KotlinxLibraryAccessors extends SubDependencyFactory {
        private final KotlinxCoroutinesLibraryAccessors laccForKotlinxCoroutinesLibraryAccessors = new KotlinxCoroutinesLibraryAccessors(owner);
        private final KotlinxSerializationLibraryAccessors laccForKotlinxSerializationLibraryAccessors = new KotlinxSerializationLibraryAccessors(owner);

        public KotlinxLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>datetime</b> with <b>org.jetbrains.kotlinx:kotlinx-datetime</b> coordinates and
         * with version <b>0.6.1</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getDatetime() {
            return create("kotlinx.datetime");
        }

        /**
         * Group of libraries at <b>kotlinx.coroutines</b>
         */
        public KotlinxCoroutinesLibraryAccessors getCoroutines() {
            return laccForKotlinxCoroutinesLibraryAccessors;
        }

        /**
         * Group of libraries at <b>kotlinx.serialization</b>
         */
        public KotlinxSerializationLibraryAccessors getSerialization() {
            return laccForKotlinxSerializationLibraryAccessors;
        }

    }

    public static class KotlinxCoroutinesLibraryAccessors extends SubDependencyFactory {

        public KotlinxCoroutinesLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>core</b> with <b>org.jetbrains.kotlinx:kotlinx-coroutines-core</b> coordinates and
         * with version reference <b>kotlinx.coroutines</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCore() {
            return create("kotlinx.coroutines.core");
        }

    }

    public static class KotlinxSerializationLibraryAccessors extends SubDependencyFactory {

        public KotlinxSerializationLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>json</b> with <b>org.jetbrains.kotlinx:kotlinx-serialization-json</b> coordinates and
         * with version reference <b>kotlinx.serialization</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getJson() {
            return create("kotlinx.serialization.json");
        }

    }

    public static class KtorLibraryAccessors extends SubDependencyFactory {
        private final KtorSerializationLibraryAccessors laccForKtorSerializationLibraryAccessors = new KtorSerializationLibraryAccessors(owner);
        private final KtorServerLibraryAccessors laccForKtorServerLibraryAccessors = new KtorServerLibraryAccessors(owner);

        public KtorLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Group of libraries at <b>ktor.serialization</b>
         */
        public KtorSerializationLibraryAccessors getSerialization() {
            return laccForKtorSerializationLibraryAccessors;
        }

        /**
         * Group of libraries at <b>ktor.server</b>
         */
        public KtorServerLibraryAccessors getServer() {
            return laccForKtorServerLibraryAccessors;
        }

    }

    public static class KtorSerializationLibraryAccessors extends SubDependencyFactory {
        private final KtorSerializationKotlinxLibraryAccessors laccForKtorSerializationKotlinxLibraryAccessors = new KtorSerializationKotlinxLibraryAccessors(owner);

        public KtorSerializationLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Group of libraries at <b>ktor.serialization.kotlinx</b>
         */
        public KtorSerializationKotlinxLibraryAccessors getKotlinx() {
            return laccForKtorSerializationKotlinxLibraryAccessors;
        }

    }

    public static class KtorSerializationKotlinxLibraryAccessors extends SubDependencyFactory {

        public KtorSerializationKotlinxLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>json</b> with <b>io.ktor:ktor-serialization-kotlinx-json</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getJson() {
            return create("ktor.serialization.kotlinx.json");
        }

    }

    public static class KtorServerLibraryAccessors extends SubDependencyFactory {
        private final KtorServerConfigLibraryAccessors laccForKtorServerConfigLibraryAccessors = new KtorServerConfigLibraryAccessors(owner);
        private final KtorServerContentLibraryAccessors laccForKtorServerContentLibraryAccessors = new KtorServerContentLibraryAccessors(owner);
        private final KtorServerTestLibraryAccessors laccForKtorServerTestLibraryAccessors = new KtorServerTestLibraryAccessors(owner);

        public KtorServerLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>cio</b> with <b>io.ktor:ktor-server-cio</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCio() {
            return create("ktor.server.cio");
        }

        /**
         * Dependency provider for <b>core</b> with <b>io.ktor:ktor-server-core</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getCore() {
            return create("ktor.server.core");
        }

        /**
         * Dependency provider for <b>sse</b> with <b>io.ktor:ktor-server-sse</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getSse() {
            return create("ktor.server.sse");
        }

        /**
         * Group of libraries at <b>ktor.server.config</b>
         */
        public KtorServerConfigLibraryAccessors getConfig() {
            return laccForKtorServerConfigLibraryAccessors;
        }

        /**
         * Group of libraries at <b>ktor.server.content</b>
         */
        public KtorServerContentLibraryAccessors getContent() {
            return laccForKtorServerContentLibraryAccessors;
        }

        /**
         * Group of libraries at <b>ktor.server.test</b>
         */
        public KtorServerTestLibraryAccessors getTest() {
            return laccForKtorServerTestLibraryAccessors;
        }

    }

    public static class KtorServerConfigLibraryAccessors extends SubDependencyFactory {

        public KtorServerConfigLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>yaml</b> with <b>io.ktor:ktor-server-config-yaml</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getYaml() {
            return create("ktor.server.config.yaml");
        }

    }

    public static class KtorServerContentLibraryAccessors extends SubDependencyFactory {

        public KtorServerContentLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>negotiation</b> with <b>io.ktor:ktor-server-content-negotiation</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getNegotiation() {
            return create("ktor.server.content.negotiation");
        }

    }

    public static class KtorServerTestLibraryAccessors extends SubDependencyFactory {

        public KtorServerTestLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>host</b> with <b>io.ktor:ktor-server-test-host</b> coordinates and
         * with version reference <b>ktor</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getHost() {
            return create("ktor.server.test.host");
        }

    }

    public static class LogbackLibraryAccessors extends SubDependencyFactory {

        public LogbackLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>classic</b> with <b>ch.qos.logback:logback-classic</b> coordinates and
         * with version reference <b>logback</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getClassic() {
            return create("logback.classic");
        }

    }

    public static class McpLibraryAccessors extends SubDependencyFactory {
        private final McpKotlinLibraryAccessors laccForMcpKotlinLibraryAccessors = new McpKotlinLibraryAccessors(owner);

        public McpLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Group of libraries at <b>mcp.kotlin</b>
         */
        public McpKotlinLibraryAccessors getKotlin() {
            return laccForMcpKotlinLibraryAccessors;
        }

    }

    public static class McpKotlinLibraryAccessors extends SubDependencyFactory {

        public McpKotlinLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>sdk</b> with <b>io.modelcontextprotocol:kotlin-sdk</b> coordinates and
         * with version reference <b>mcp.sdk</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getSdk() {
            return create("mcp.kotlin.sdk");
        }

    }

    public static class SqliteLibraryAccessors extends SubDependencyFactory {

        public SqliteLibraryAccessors(AbstractExternalDependencyFactory owner) { super(owner); }

        /**
         * Dependency provider for <b>jdbc</b> with <b>org.xerial:sqlite-jdbc</b> coordinates and
         * with version reference <b>sqlite.jdbc</b>
         * <p>
         * This dependency was declared in catalog libs.versions.toml
         */
        public Provider<MinimalExternalModuleDependency> getJdbc() {
            return create("sqlite.jdbc");
        }

    }

    public static class VersionAccessors extends VersionFactory  {

        private final KotlinxVersionAccessors vaccForKotlinxVersionAccessors = new KotlinxVersionAccessors(providers, config);
        private final McpVersionAccessors vaccForMcpVersionAccessors = new McpVersionAccessors(providers, config);
        private final SqliteVersionAccessors vaccForSqliteVersionAccessors = new SqliteVersionAccessors(providers, config);
        public VersionAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Version alias <b>exposed</b> with value <b>0.57.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getExposed() { return getVersion("exposed"); }

        /**
         * Version alias <b>graalvm</b> with value <b>0.10.3</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getGraalvm() { return getVersion("graalvm"); }

        /**
         * Version alias <b>koin</b> with value <b>4.0.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getKoin() { return getVersion("koin"); }

        /**
         * Version alias <b>kotest</b> with value <b>5.9.1</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getKotest() { return getVersion("kotest"); }

        /**
         * Version alias <b>kotlin</b> with value <b>2.0.21</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getKotlin() { return getVersion("kotlin"); }

        /**
         * Version alias <b>ktor</b> with value <b>3.2.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getKtor() { return getVersion("ktor"); }

        /**
         * Version alias <b>logback</b> with value <b>1.5.12</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getLogback() { return getVersion("logback"); }

        /**
         * Version alias <b>mockk</b> with value <b>1.13.13</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getMockk() { return getVersion("mockk"); }

        /**
         * Group of versions at <b>versions.kotlinx</b>
         */
        public KotlinxVersionAccessors getKotlinx() {
            return vaccForKotlinxVersionAccessors;
        }

        /**
         * Group of versions at <b>versions.mcp</b>
         */
        public McpVersionAccessors getMcp() {
            return vaccForMcpVersionAccessors;
        }

        /**
         * Group of versions at <b>versions.sqlite</b>
         */
        public SqliteVersionAccessors getSqlite() {
            return vaccForSqliteVersionAccessors;
        }

    }

    public static class KotlinxVersionAccessors extends VersionFactory  {

        public KotlinxVersionAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Version alias <b>kotlinx.coroutines</b> with value <b>1.9.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getCoroutines() { return getVersion("kotlinx.coroutines"); }

        /**
         * Version alias <b>kotlinx.serialization</b> with value <b>1.7.3</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getSerialization() { return getVersion("kotlinx.serialization"); }

    }

    public static class McpVersionAccessors extends VersionFactory  {

        public McpVersionAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Version alias <b>mcp.sdk</b> with value <b>0.1.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getSdk() { return getVersion("mcp.sdk"); }

    }

    public static class SqliteVersionAccessors extends VersionFactory  {

        public SqliteVersionAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Version alias <b>sqlite.jdbc</b> with value <b>3.47.1.0</b>
         * <p>
         * If the version is a rich version and cannot be represented as a
         * single version string, an empty string is returned.
         * <p>
         * This version was declared in catalog libs.versions.toml
         */
        public Provider<String> getJdbc() { return getVersion("sqlite.jdbc"); }

    }

    public static class BundleAccessors extends BundleFactory {

        public BundleAccessors(ObjectFactory objects, ProviderFactory providers, DefaultVersionCatalog config, ImmutableAttributesFactory attributesFactory, CapabilityNotationParser capabilityNotationParser) { super(objects, providers, config, attributesFactory, capabilityNotationParser); }

    }

    public static class PluginAccessors extends PluginFactory {
        private final KotlinPluginAccessors paccForKotlinPluginAccessors = new KotlinPluginAccessors(providers, config);

        public PluginAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Plugin provider for <b>graalvm</b> with plugin id <b>org.graalvm.buildtools.native</b> and
         * with version reference <b>graalvm</b>
         * <p>
         * This plugin was declared in catalog libs.versions.toml
         */
        public Provider<PluginDependency> getGraalvm() { return createPlugin("graalvm"); }

        /**
         * Plugin provider for <b>ktor</b> with plugin id <b>io.ktor.plugin</b> and
         * with version <b>3.2.0</b>
         * <p>
         * This plugin was declared in catalog libs.versions.toml
         */
        public Provider<PluginDependency> getKtor() { return createPlugin("ktor"); }

        /**
         * Group of plugins at <b>plugins.kotlin</b>
         */
        public KotlinPluginAccessors getKotlin() {
            return paccForKotlinPluginAccessors;
        }

    }

    public static class KotlinPluginAccessors extends PluginFactory {

        public KotlinPluginAccessors(ProviderFactory providers, DefaultVersionCatalog config) { super(providers, config); }

        /**
         * Plugin provider for <b>kotlin.jvm</b> with plugin id <b>org.jetbrains.kotlin.jvm</b> and
         * with version reference <b>kotlin</b>
         * <p>
         * This plugin was declared in catalog libs.versions.toml
         */
        public Provider<PluginDependency> getJvm() { return createPlugin("kotlin.jvm"); }

        /**
         * Plugin provider for <b>kotlin.serialization</b> with plugin id <b>org.jetbrains.kotlin.plugin.serialization</b> and
         * with version reference <b>kotlin</b>
         * <p>
         * This plugin was declared in catalog libs.versions.toml
         */
        public Provider<PluginDependency> getSerialization() { return createPlugin("kotlin.serialization"); }

    }

}
