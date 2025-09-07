package io.spiralhouse.cycletime.mcp.resources.validation

/**
 * Validator for resource URIs
 * 
 * This class provides URI validation and parsing functionality,
 * ensuring that resource URIs follow the expected format and
 * extracting components for processing.
 */
class UriValidator {
    
    companion object {
        // Supported URI schemes
        private val VALID_SCHEMES = setOf(
            "config",
            "file",
            "state",
            "data",
            "memory",
            "cache"
        )
        
        // URI pattern: scheme://[authority]/path[?query][#fragment]
        private val URI_PATTERN = Regex(
            """^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^\/\?#]*)(\/[^\?#]*)?(\?[^#]*)?(#.*)?$"""
        )
        
        /**
         * Validate a URI string
         * 
         * @param uri The URI to validate
         * @return true if the URI is valid, false otherwise
         */
        fun isValid(uri: String): Boolean {
            val match = URI_PATTERN.matchEntire(uri) ?: return false
            val scheme = match.groupValues[1]
            return scheme in VALID_SCHEMES
        }
        
        /**
         * Parse a URI into its components
         * 
         * @param uri The URI to parse
         * @return A UriComponents object, or null if invalid
         */
        fun parse(uri: String): UriComponents? {
            val match = URI_PATTERN.matchEntire(uri) ?: return null
            val scheme = match.groupValues[1]
            
            if (scheme !in VALID_SCHEMES) return null
            
            return UriComponents(
                scheme = scheme,
                authority = match.groupValues[2].ifEmpty { null },
                path = match.groupValues[3]?.removePrefix("/"),
                query = match.groupValues[4]?.removePrefix("?"),
                fragment = match.groupValues[5]?.removePrefix("#")
            )
        }
        
        /**
         * Build a URI from components
         * 
         * @param components The URI components
         * @return The constructed URI string
         */
        fun build(components: UriComponents): String {
            val builder = StringBuilder()
            builder.append(components.scheme)
            builder.append("://")
            
            components.authority?.let { builder.append(it) }
            
            components.path?.let { 
                if (!it.startsWith("/")) builder.append("/")
                builder.append(it)
            }
            
            components.query?.let { 
                builder.append("?").append(it)
            }
            
            components.fragment?.let { 
                builder.append("#").append(it)
            }
            
            return builder.toString()
        }
        
        /**
         * Normalize a URI for consistent comparison
         * 
         * @param uri The URI to normalize
         * @return The normalized URI, or null if invalid
         */
        fun normalize(uri: String): String? {
            val components = parse(uri) ?: return null
            
            // Normalize path (remove redundant segments)
            components.path?.let { path ->
                val segments = path.split("/").filter { it.isNotEmpty() }
                val normalized = segments.filter { it != "." }.fold(mutableListOf<String>()) { acc, segment ->
                    when (segment) {
                        ".." -> if (acc.isNotEmpty()) acc.removeAt(acc.size - 1)
                        else -> acc.add(segment)
                    }
                    acc
                }
                return components.copy(path = normalized.joinToString("/")).let { build(it) }
            }
            
            return build(components)
        }
    }
    
    /**
     * Components of a parsed URI
     */
    data class UriComponents(
        val scheme: String,
        val authority: String? = null,
        val path: String? = null,
        val query: String? = null,
        val fragment: String? = null
    )
}