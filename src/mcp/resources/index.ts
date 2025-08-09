/**
 * JCVD MCP Resources
 *
 * Central export for the JCVD MCP resource framework including
 * interfaces, base classes, metadata management, and registry.
 */

// Core interfaces and utilities
export {
  type Resource,
  type ResourceMetadata,
  type ResourceContent,
  type ResourceCapability,
  type SubscribableResource,
  type WritableResource,
  type ResourceFactory,
  ResourceURI,
  ResourceError,
  ResourceNotFoundError,
  ResourceUnavailableError,
  InvalidResourceURIError,
} from './resource-interface.js';

// Base resource implementation
export {
  BaseResource,
  type ContentProvider,
  type AvailabilityChecker,
  type ResourceStatistics,
} from './base-resource.js';

// Metadata management
export {
  ResourceMetadataManager,
  type ResourceCapabilityInfo,
  type ResourceDiscoveryInfo,
  type MetadataValidationResult,
  type MCPAdvertisement,
} from './resource-metadata.js';

// Resource registry
export {
  ResourceRegistry,
  type ResourceInfo,
  type ResourceHealthCheck,
  type RegistryStatistics,
  type BatchRegistrationResult,
  type RegistryEvents,
} from './resource-registry.js';
